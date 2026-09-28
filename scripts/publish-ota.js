#!/usr/bin/env node

/**
 * GoConnect - Automated OTA Bundle & Firestore Release Publisher
 * 
 * Usage:
 *   node scripts/publish-ota.js --version 1.0.1 --bundleVersion 101 --channel production --notes "UI enhancements and fixes"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// 1. Run the bundle generator
const args = process.argv.slice(2).join(' ');
console.log('[OTA Publisher] Running bundle builder...');
execSync(`node scripts/release-ota.js ${args}`, { cwd: projectRoot, stdio: 'inherit' });

// 2. Locate generated manifest
const releaseScriptParams = {};
const rawArgs = process.argv.slice(2);
for (let i = 0; i < rawArgs.length; i += 2) {
    const key = rawArgs[i].replace(/^--/, '');
    releaseScriptParams[key] = rawArgs[i + 1];
}

const channel = releaseScriptParams.channel || 'production';
const bundleVersion = releaseScriptParams.bundleVersion || releaseScriptParams.bundle || '101';
const manifestPath = path.join(projectRoot, 'dist', 'ota', channel, `v${bundleVersion}`, 'manifest.json');
const bundlePath = path.join(projectRoot, 'dist', 'ota', channel, `v${bundleVersion}`, 'index.android.bundle');

if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    console.log('\n====================================================');
    console.log('   🎉 OTA BUNDLE READY FOR CLOUD DEPLOYMENT');
    console.log('====================================================');
    console.log(`📁 Bundle File:   ${bundlePath}`);
    console.log(`📄 Manifest File: ${manifestPath}`);
    console.log('\n--- HOW TO ACTIVATE IN FIREBASE ---');
    console.log('1. Upload "index.android.bundle" to Firebase Storage:');
    console.log(`   Path: ota_bundles/${channel}/v${bundleVersion}/index.android.bundle`);
    console.log('\n2. In Firebase Console -> Firestore -> collection "ota_releases":');
    console.log(`   Document ID: ${channel}_v${bundleVersion}`);
    console.log('   Fields:');
    console.log(JSON.stringify(manifest, null, 2));
    console.log('====================================================\n');
}
