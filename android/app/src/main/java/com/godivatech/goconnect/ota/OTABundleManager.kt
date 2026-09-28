package com.godivatech.goconnect.ota

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import org.json.JSONObject

object OTABundleManager {
    private const val TAG = "OTABundleManager"
    private const val PREFS_NAME = "goconnect_ota_prefs"
    private const val KEY_BUNDLE_VERSION = "ota_bundle_version"
    private const val KEY_BUNDLE_HASH = "ota_bundle_hash"
    private const val KEY_CHANNEL = "ota_channel"
    private const val KEY_INSTALLED_AT = "ota_installed_at"
    private const val KEY_CRASH_COUNT = "ota_crash_count"
    private const val KEY_HEALTHY = "ota_is_healthy"
    private const val MAX_CRASH_ATTEMPTS = 3

    private const val BUNDLE_FILENAME = "index.android.bundle"
    private const val OTA_DIR = "ota"
    private const val CURRENT_DIR = "current"
    private const val STAGED_DIR = "staged"
    private const val BACKUP_DIR = "backup"

    fun getOtaDir(context: Context): File {
        val dir = File(context.filesDir, OTA_DIR)
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    fun getCurrentBundleDir(context: Context): File {
        val dir = File(getOtaDir(context), CURRENT_DIR)
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    fun getStagedBundleDir(context: Context): File {
        val dir = File(getOtaDir(context), STAGED_DIR)
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    fun getBackupBundleDir(context: Context): File {
        val dir = File(getOtaDir(context), BACKUP_DIR)
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    fun getJSBundleFile(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val isHealthy = prefs.getBoolean(KEY_HEALTHY, true)
        val crashCount = prefs.getInt(KEY_CRASH_COUNT, 0)

        // Crash Detection & Safe-Rollback Guard
        if (!isHealthy && crashCount >= MAX_CRASH_ATTEMPTS) {
            Log.e(TAG, "[OTA SafeBoot] Crash limit reached ($crashCount). Rolling back to base APK bundle.")
            rollbackToBase(context)
            return null
        }

        val bundleFile = File(getCurrentBundleDir(context), BUNDLE_FILENAME)
        if (bundleFile.exists() && bundleFile.isFile && bundleFile.length() > 0) {
            // Track boot trial
            prefs.edit()
                .putBoolean(KEY_HEALTHY, false)
                .putInt(KEY_CRASH_COUNT, crashCount + 1)
                .apply()

            Log.i(TAG, "[OTA] Loading active bundle from: ${bundleFile.absolutePath} (trial ${crashCount + 1})")
            return bundleFile.absolutePath
        }

        Log.i(TAG, "[OTA] No custom bundle found. Loading embedded APK bundle.")
        return null
    }

    fun markSuccess(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(KEY_HEALTHY, true)
            .putInt(KEY_CRASH_COUNT, 0)
            .apply()
        Log.i(TAG, "[OTA] Bundle verified healthy. Boot counters reset.")
    }

    fun getCurrentBundleInfo(context: Context): Map<String, Any> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val bundleFile = File(getCurrentBundleDir(context), BUNDLE_FILENAME)
        val isOtaActive = bundleFile.exists() && bundleFile.length() > 0

        return mapOf(
            "isOtaActive" to isOtaActive,
            "bundleVersion" to prefs.getInt(KEY_BUNDLE_VERSION, 0),
            "bundleHash" to (prefs.getString(KEY_BUNDLE_HASH, "") ?: ""),
            "channel" to (prefs.getString(KEY_CHANNEL, "production") ?: "production"),
            "installedAt" to (prefs.getString(KEY_INSTALLED_AT, "") ?: "")
        )
    }

    fun calculateSHA256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { fis ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (fis.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        val bytes = digest.digest()
        val sb = StringBuilder()
        for (b in bytes) {
            sb.append(String.format("%02x", b))
        }
        return sb.toString()
    }

    fun downloadBundle(
        context: Context,
        urlString: String,
        expectedHash: String,
        onProgress: (progress: Double, bytesDownloaded: Long, totalBytes: Long) -> Unit
    ): File {
        val stagedDir = getStagedBundleDir(context)
        val destinationFile = File(stagedDir, BUNDLE_FILENAME)
        if (destinationFile.exists()) destinationFile.delete()

        val url = URL(urlString)
        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 30000
        connection.readTimeout = 60000
        connection.connect()

        if (connection.responseCode != HttpURLConnection.HTTP_OK) {
            throw Exception("OTA Server returned HTTP ${connection.responseCode} ${connection.responseMessage}")
        }

        val fileLength = connection.contentLength.toLong()
        var bytesDownloaded: Long = 0

        connection.inputStream.use { input ->
            FileOutputStream(destinationFile).use { output ->
                val data = ByteArray(8192)
                var count: Int
                while (input.read(data).also { count = it } != -1) {
                    output.write(data, 0, count)
                    bytesDownloaded += count
                    val progress = if (fileLength > 0) bytesDownloaded.toDouble() / fileLength.toDouble() else 0.0
                    onProgress(progress, bytesDownloaded, fileLength)
                }
                output.flush()
            }
        }

        // Verify Hash Integrity
        if (expectedHash.isNotEmpty()) {
            val calculatedHash = calculateSHA256(destinationFile)
            if (!calculatedHash.equals(expectedHash, ignoreCase = true)) {
                destinationFile.delete()
                throw Exception("OTA Hash Mismatch! Expected: $expectedHash, Calculated: $calculatedHash")
            }
        }

        return destinationFile
    }

    fun applyStagedBundle(
        context: Context,
        bundleVersion: Int,
        hash: String,
        channel: String
    ): Boolean {
        val stagedFile = File(getStagedBundleDir(context), BUNDLE_FILENAME)
        if (!stagedFile.exists() || stagedFile.length() == 0L) {
            throw Exception("No staged OTA bundle found to apply.")
        }

        val currentDir = getCurrentBundleDir(context)
        val currentFile = File(currentDir, BUNDLE_FILENAME)

        // Backup existing current bundle if exists
        val backupDir = getBackupBundleDir(context)
        val backupFile = File(backupDir, BUNDLE_FILENAME)
        if (currentFile.exists()) {
            if (backupFile.exists()) backupFile.delete()
            currentFile.copyTo(backupFile, overwrite = true)
        }

        // Promote staged to current
        if (currentFile.exists()) currentFile.delete()
        val success = stagedFile.renameTo(currentFile)
        if (!success) {
            stagedFile.copyTo(currentFile, overwrite = true)
            stagedFile.delete()
        }

        // Save preferences
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putInt(KEY_BUNDLE_VERSION, bundleVersion)
            .putString(KEY_BUNDLE_HASH, hash)
            .putString(KEY_CHANNEL, channel)
            .putString(KEY_INSTALLED_AT, java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date()))
            .putBoolean(KEY_HEALTHY, true)
            .putInt(KEY_CRASH_COUNT, 0)
            .apply()

        Log.i(TAG, "[OTA] Staged bundle successfully promoted to current! (v$bundleVersion)")
        return true
    }

    fun rollbackToBase(context: Context) {
        val currentDir = getCurrentBundleDir(context)
        currentDir.deleteRecursively()
        getStagedBundleDir(context).deleteRecursively()
        getBackupBundleDir(context).deleteRecursively()

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
        Log.i(TAG, "[OTA] Rolled back to base APK bundle.")
    }

    fun restartApp(context: Context) {
        Handler(Looper.getMainLooper()).post {
            try {
                val app = context.applicationContext as? ReactApplication
                val reactInstanceManager: ReactInstanceManager? = app?.reactNativeHost?.reactInstanceManager

                if (reactInstanceManager != null) {
                    reactInstanceManager.recreateReactContextInBackground()
                    Log.i(TAG, "[OTA] React context recreated seamlessly.")
                } else {
                    // Fallback to process restart
                    val packageManager = context.packageManager
                    val intent = packageManager.getLaunchIntentForPackage(context.packageName)
                    intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    context.startActivity(intent)
                    Runtime.getRuntime().exit(0)
                }
            } catch (e: Exception) {
                Log.e(TAG, "[OTA] Failed to recreate context, restarting activity: ", e)
                val packageManager = context.packageManager
                val intent = packageManager.getLaunchIntentForPackage(context.packageName)
                intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                context.startActivity(intent)
                Runtime.getRuntime().exit(0)
            }
        }
    }
}
