# Keep GoConnect OTA native classes and methods
-keep class com.godivatech.goconnect.ota.** { *; }
-keepclassmembers class com.godivatech.goconnect.ota.** { *; }

# Keep React Native NativeModule bridge and annotations
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactMethod(isBlockingSynchronousMethod = true) *;
}

# Keep MMKV and Firebase
-keep class com.tencent.mmkv.** { *; }
-keep class com.google.firebase.** { *; }

