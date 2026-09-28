package com.godivatech.goconnect.ota

import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.Executors

class OTAModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()

    override fun getName(): String = "GoConnectOTA"

    private fun sendEvent(eventName: String, params: Any?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        }
    }

    @ReactMethod
    fun getAppVersion(promise: Promise) {
        try {
            val pInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.packageManager.getPackageInfo(
                    reactContext.packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
            }

            val map = Arguments.createMap().apply {
                putString("appVersion", pInfo.versionName ?: "1.0.0")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    putDouble("buildNumber", pInfo.longVersionCode.toDouble())
                } else {
                    @Suppress("DEPRECATION")
                    putDouble("buildNumber", pInfo.versionCode.toDouble())
                }
                putString("osVersion", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
                putString("packageName", reactContext.packageName)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("APP_VERSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCurrentBundleInfo(promise: Promise) {
        try {
            val info = OTABundleManager.getCurrentBundleInfo(reactContext)
            val map = Arguments.createMap().apply {
                putBoolean("isOtaActive", info["isOtaActive"] as Boolean)
                putInt("bundleVersion", info["bundleVersion"] as Int)
                putString("bundleHash", info["bundleHash"] as String)
                putString("channel", info["channel"] as String)
                putString("installedAt", info["installedAt"] as String)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("BUNDLE_INFO_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun downloadBundle(
        urlString: String,
        expectedHash: String,
        bundleVersion: Int,
        channel: String,
        promise: Promise
    ) {
        executor.execute {
            try {
                val downloadedFile = OTABundleManager.downloadBundle(
                    reactContext,
                    urlString,
                    expectedHash
                ) { progress, bytesDownloaded, totalBytes ->
                    val eventData = Arguments.createMap().apply {
                        putDouble("progress", progress)
                        putDouble("bytesDownloaded", bytesDownloaded.toDouble())
                        putDouble("totalBytes", totalBytes.toDouble())
                        putInt("bundleVersion", bundleVersion)
                    }
                    sendEvent("onOtaDownloadProgress", eventData)
                }

                val resultMap = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("filePath", downloadedFile.absolutePath)
                    putDouble("fileSizeBytes", downloadedFile.length().toDouble())
                    putInt("bundleVersion", bundleVersion)
                    putString("channel", channel)
                }
                promise.resolve(resultMap)
            } catch (e: Exception) {
                promise.reject("OTA_DOWNLOAD_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun applyStagedBundle(
        bundleVersion: Int,
        hash: String,
        channel: String,
        promise: Promise
    ) {
        try {
            val success = OTABundleManager.applyStagedBundle(
                reactContext,
                bundleVersion,
                hash,
                channel
            )
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("OTA_APPLY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun restartApp(promise: Promise) {
        try {
            OTABundleManager.restartApp(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OTA_RESTART_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun rollbackToBase(promise: Promise) {
        try {
            OTABundleManager.rollbackToBase(reactContext)
            OTABundleManager.restartApp(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OTA_ROLLBACK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun markUpdateSuccess(promise: Promise) {
        try {
            OTABundleManager.markSuccess(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OTA_HEALTH_ERROR", e.message, e)
        }
    }

    // Required for React Native Event Emitter
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
