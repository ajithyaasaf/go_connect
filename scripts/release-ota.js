#!/usr/bin/env node

/**
 * GoConnect Over-The-Air (OTA) Bundle Generator & Release Tool
 *
 * Usage:
 *   node scripts/release-ota.js --version 1.0.1 --bundleVersion 101 --channel production --notes "Bug fixes and faster sync"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse CLI Arguments
const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    params[key] = value;
}

const version = params.version || '1.0.1';
const bundleVersion = parseInt(params.bundleVersion || params.bundle || '101', 10);
const channel = params.channel || 'production';
const minNativeVersion = params.minNativeVersion || params.minNative || '1.0';
const mandatory = params.mandatory === 'true' || params.mandatory === true;
const releaseNotes = params.notes || 'Bug fixes, performance improvements, and user experience enhancements.';
const bundleUrl = params.url || `https://storage.googleapis.com/goconnect-ota-bundles/releases/${channel}/${bundleVersion}/index.android.bundle`;

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'dist', 'ota', channel, `v${bundleVersion}`);
const bundleOutputFile = path.join(outputDir, 'index.android.bundle');
const manifestOutputFile = path.join(outputDir, 'manifest.json');

console.log('====================================================');
console.log('   GoConnect OTA Bundle Generator & Publisher');
console.log('====================================================');
console.log(`Version:            ${version}`);
console.log(`Bundle Version:     ${bundleVersion}`);
console.log(`Channel:            ${channel}`);
console.log(`Min Native Ver:     ${minNativeVersion}`);
console.log(`Mandatory Restart:  ${mandatory}`);
console.log(`Release Notes:      ${releaseNotes}`);
console.log(`Output Directory:   ${outputDir}`);
console.log('----------------------------------------------------');

// 1. Ensure directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 2. Generate React Native Android JS Bundle
console.log('\n[1/3] Bundling React Native JavaScript & Assets...');
try {
    const cliPath = path.join(projectRoot, 'node_modules', '@react-native-community', 'cli', 'build', 'bin.js');
    const bundleCmd = `node "${cliPath}" bundle --platform android --dev false --entry-file index.js --bundle-output "${bundleOutputFile}" --assets-dest "${outputDir}" --reset-cache`;
    execSync(bundleCmd, { cwd: projectRoot, stdio: 'inherit' });
    console.log('✓ React Native bundle compiled successfully.');
} catch (error) {
    console.error('✗ Failed to generate JS bundle:', error.message);
    process.exit(1);
}

// 3. Compute SHA-256 Hash
console.log('\n[2/3] Calculating SHA-256 Checksum...');
const bundleBuffer = fs.readFileSync(bundleOutputFile);
const hashSum = crypto.createHash('sha256');
hashSum.update(bundleBuffer);
const sha256Hex = hashSum.digest('hex');
const fileSizeBytes = bundleBuffer.length;

console.log(`✓ Bundle Size: ${(fileSizeBytes / 1024).toFixed(1)} KB`);
console.log(`✓ SHA-256:     ${sha256Hex}`);

// 4. Create Manifest Payload for Firestore / API
const manifest = {
    version,
    bundleVersion,
    minNativeVersion,
    channel,
    bundleUrl,
    hash: sha256Hex,
    sizeBytes: fileSizeBytes,
    mandatory,
    releaseNotes,
    releasedAt: new Date().toISOString(),
    rolloutPercentage: 100,
    enabled: true,
};

fs.writeFileSync(manifestOutputFile, JSON.stringify(manifest, null, 2), 'utf8');
console.log('\n[3/3] Manifest file created at: ' + manifestOutputFile);

console.log('\n====================================================');
console.log('                 DEPLOYMENT READY');
console.log('====================================================');
console.log('To publish this release to Firebase Firestore, add document to `ota_releases`:\n');
console.log(JSON.stringify(manifest, null, 2));
console.log('\nBundle File to upload to Cloud Storage / CDN:');
console.log(bundleOutputFile);
console.log('====================================================\n');
