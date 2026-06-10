package com.freyrnorpixel.unfocuswear.data

import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.freyrnorpixel.unfocuswear.viewmodel.WatchStateHolder

/**
 * Runs in the background and handles data pushed from the phone app.
 *
 * Phone → Watch:  DataClient puts a JSON snapshot at WearPaths.SNAPSHOT
 * Watch → Phone:  MessageClient sends small mutation messages (toggle/increment)
 *                 which the phone's native module receives and applies to Zustand.
 */
class WearSyncService : WearableListenerService() {

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        dataEvents.forEach { event ->
            val path = event.dataItem.uri.path ?: return@forEach
            if (path == WearPaths.SNAPSHOT) {
                val map = DataMapItem.fromDataItem(event.dataItem).dataMap
                val json = map.getString("payload") ?: return@forEach
                WatchStateHolder.applySnapshot(json)
            }
        }
    }

    // Acknowledge messages sent back from phone (e.g. confirming a toggle was persisted)
    override fun onMessageReceived(event: MessageEvent) {
        // No-op for demo — mutations are applied optimistically on the watch
    }
}
