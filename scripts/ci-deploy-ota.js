#!/usr/bin/env node

/**
 * GoConnect - Automated CI/CD OTA Release & Firestore Deployment
 *
 * This script runs inside GitHub Actions CI/CD on every push to main.
 * It:
 *   1. Compiles the React Native Android JS bundle & assets
 *   2. Computes the SHA-256 integrity hash & size
 *   3. Queries Firestore for the current highest bundleVersion and auto-increments it
 *   4. Prepares the release artifact for GitHub Releases
 *   5. Writes the new release metadata directly to Firestore `ota_releases`
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

async function run() {
    console.log('====================================================');
    console.log('  GoConnect Automatic CI/CD OTA Release Pipeline');
    console.log('====================================================');

    const channel = process.env.OTA_CHANNEL || 'production';
    const commitMsg = process.env.COMMIT_MESSAGE || 'Automated OTA update from git push';
    const repo = process.env.GITHUB_REPOSITORY || 'ajithyaasaf/go_connect';
    const outputDir = path.join(projectRoot, 'dist', 'ota');
    const bundleOutputFile = path.join(outputDir, 'index.android.bundle');

    // 1. Ensure output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 2. Compile React Native Bundle
    console.log('\n[1/4] Compiling React Native production bundle...');
    const isWin = process.platform === 'win32';
    const rnCmd = isWin ? 'npx.cmd react-native bundle' : 'npx react-native bundle';
    const bundleCmd = `${rnCmd} --platform android --dev false --entry-file index.js --bundle-output "${bundleOutputFile}" --assets-dest "${outputDir}"`;
    
    console.log(`> ${bundleCmd}`);
    execSync(bundleCmd, { cwd: projectRoot, stdio: 'inherit' });
    console.log('✓ Bundle successfully generated.');

    // 3. Compute SHA-256 Hash and Size
    console.log('\n[2/4] Calculating SHA-256 checksum...');
    const bundleBuffer = fs.readFileSync(bundleOutputFile);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(bundleBuffer);
    const sha256Hex = hashSum.digest('hex');
    const fileSizeBytes = bundleBuffer.length;

    console.log(`✓ Size: ${(fileSizeBytes / 1024).toFixed(1)} KB (${fileSizeBytes} bytes)`);
    console.log(`✓ SHA-256: ${sha256Hex}`);

    // 4. Initialize Firebase Admin
    console.log('\n[3/4] Connecting to Firestore...');
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    let admin = null;
    let db = null;
    let nextBundleVersion = 103;

    if (serviceAccountJson) {
        try {
            admin = require('firebase-admin');
            const credentials = JSON.parse(serviceAccountJson);
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(credentials),
                });
            }
            db = admin.firestore();
            console.log('✓ Authenticated with Firebase Admin SDK.');

            // Query highest bundleVersion (index-free query)
            const snapshot = await db.collection('ota_releases')
                .where('channel', '==', channel)
                .get();

            const releases = snapshot.docs
                .map(doc => doc.data())
                .filter(doc => typeof doc.bundleVersion === 'number')
                .sort((a, b) => b.bundleVersion - a.bundleVersion);

            if (releases.length > 0) {
                nextBundleVersion = releases[0].bundleVersion + 1;
            }
        } catch (err) {
            console.warn('⚠️ Warning during Firestore query:', err.message);
            if (process.env.GITHUB_RUN_NUMBER) {
                nextBundleVersion = 100 + parseInt(process.env.GITHUB_RUN_NUMBER, 10);
            }
        }
    } else {
        console.log('ℹ️ No FIREBASE_SERVICE_ACCOUNT secret found. Using run number fallback.');
        if (process.env.GITHUB_RUN_NUMBER) {
            nextBundleVersion = 100 + parseInt(process.env.GITHUB_RUN_NUMBER, 10);
        }
    }

    console.log(`✓ Next Release Tag: v${nextBundleVersion}`);
    const downloadUrl = `https://github.com/${repo}/releases/download/v${nextBundleVersion}/index.android.bundle`;

    // 5. Construct Manifest Payload
    const manifest = {
        version: packageJson.version || '1.0.1',
        bundleVersion: nextBundleVersion,
        minNativeVersion: '1.0',
        channel,
        bundleUrl: downloadUrl,
        hash: sha256Hex,
        sizeBytes: fileSizeBytes,
        mandatory: false,
        releaseNotes: commitMsg.slice(0, 150),
        releasedAt: new Date().toISOString(),
        rolloutPercentage: 100,
        enabled: true,
    };

    // Save manifest locally for release upload
    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Export output variables for GitHub Actions steps
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `BUNDLE_VERSION=${nextBundleVersion}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `RELEASE_TAG=v${nextBundleVersion}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `BUNDLE_PATH=${bundleOutputFile}\n`);
    }

    // 6. Deploy to Firestore
    if (db) {
        console.log('\n[4/4] Publishing release to Firestore `ota_releases`...');
        const docId = `${channel}_v${nextBundleVersion}`;
        await db.collection('ota_releases').doc(docId).set(manifest);
        console.log(`🎉 SUCCESS! Firestore document '${docId}' created.`);
        console.log(`App users will automatically update to v${nextBundleVersion}!`);
    } else {
        console.log('\n[4/4] Skipping Firestore publish (FIREBASE_SERVICE_ACCOUNT not configured yet).');
    }

    console.log('\n====================================================');
    console.log(`  Release v${nextBundleVersion} Ready!`);
    console.log('====================================================\n');
}

run().catch((err) => {
    console.error('✗ CI Deployment failed:', err);
    process.exit(1);
});
