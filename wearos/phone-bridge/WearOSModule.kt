package com.freyrnorpixel.unfocus.wearos

import com.facebook.react.bridge.*
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.*
import kotlinx.coroutines.*

/**
 * React Native native module.
 *
 * INSTALL STEPS (after `npx expo prebuild`):
 *   1. Copy this file to  android/app/src/main/java/com/freyrnorpixel/unfocus/wearos/
 *   2. Copy WearOSPackage.kt to the same directory
 *   3. Register WearOSPackage in android/app/src/main/java/com/freyrnorpixel/unfocus/MainApplication.kt
 *      inside getPackages():  packages.add(WearOSPackage())
 *   4. Add to android/app/build.gradle dependencies:
 *      implementation 'com.google.android.gms:play-services-wearable:18.2.0'
 *
 * JS usage: import { sendSnapshot, onWatchMessage } from 'lib/wearos'
 */
class WearOSModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    MessageClient.OnMessageReceivedListener {

    private val scope         = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val messageClient = Wearable.getMessageClient(reactContext)
    private val dataClient    = Wearable.getDataClient(reactContext)
    private val nodeClient    = Wearable.getNodeClient(reactContext)

    init {
        messageClient.addListener(this)
    }

    override fun getName() = "WearOSModule"

    // Called from JS (Zustand stores) to push a full data snapshot to the watch
    @ReactMethod
    fun sendSnapshot(json: String, promise: Promise) {
        scope.launch {
            try {
                val request = PutDataMapRequest.create(SNAPSHOT_PATH).apply {
                    dataMap.putString("payload", json)
                    dataMap.putLong("ts", System.currentTimeMillis()) // force change detection
                }.asPutDataRequest().setUrgent()
                Tasks.await(dataClient.putDataItem(request))
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("WEAR_SEND_FAILED", e.message, e)
            }
        }
    }

    // Called from JS to send a targeted mutation message to the watch
    @ReactMethod
    fun sendMessage(path: String, payload: String, promise: Promise) {
        scope.launch {
            try {
                val nodes = Tasks.await(nodeClient.connectedNodes)
                nodes.forEach { node ->
                    Tasks.await(messageClient.sendMessage(node.id, path, payload.toByteArray()))
                }
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("WEAR_MSG_FAILED", e.message, e)
            }
        }
    }

    // Receives mutation messages sent back FROM the watch (toggle task, increment habit, etc.)
    override fun onMessageReceived(event: MessageEvent) {
        val payload = String(event.data)
        val params  = Arguments.createMap().apply {
            putString("path",    event.path)
            putString("payload", payload)
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("WearOSMessage", params)
    }

    // Required for event emitter
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    override fun invalidate() {
        messageClient.removeListener(this)
        scope.cancel()
        super.invalidate()
    }

    companion object {
        private const val SNAPSHOT_PATH = "/unfocus/snapshot"
    }
}
