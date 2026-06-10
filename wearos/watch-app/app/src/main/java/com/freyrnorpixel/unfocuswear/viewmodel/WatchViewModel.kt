package com.freyrnorpixel.unfocuswear.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.freyrnorpixel.unfocuswear.data.*
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * Singleton so WearSyncService can push updates without needing a ViewModel reference.
 * The ViewModel observes this and the UI observes the ViewModel.
 */
object WatchStateHolder {
    val tasks    = MutableStateFlow(demoTasks)
    val shopping = MutableStateFlow(demoShopping)
    val habits   = MutableStateFlow(demoHabits)

    fun applySnapshot(json: String) {
        try {
            val root = JSONObject(json)

            root.optJSONArray("tasks")?.let { arr ->
                tasks.value = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    WatchTask(
                        id         = o.getString("id"),
                        title      = o.getString("title"),
                        time       = o.optString("time").ifBlank { null },
                        importance = o.optString("importance", "regular"),
                        done       = o.optBoolean("done", false)
                    )
                }
            }

            root.optJSONArray("shopping")?.let { arr ->
                shopping.value = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    WatchShoppingItem(
                        id       = o.getString("id"),
                        name     = o.getString("name"),
                        amount   = o.optString("amount", ""),
                        unit     = o.optString("unit", ""),
                        category = o.optString("category", "other"),
                        checked  = o.optBoolean("checked", false)
                    )
                }
            }

            root.optJSONArray("habits")?.let { arr ->
                habits.value = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    WatchHabit(
                        id         = o.getString("id"),
                        title      = o.getString("title"),
                        icon       = o.optString("icon", "•"),
                        kind       = o.optString("kind", "build"),
                        dailyGoal  = o.optInt("dailyGoal", 1),
                        todayCount = o.optInt("todayCount", 0)
                    )
                }
            }
        } catch (_: Exception) { }
    }
}

class WatchViewModel(application: Application) : AndroidViewModel(application) {

    val tasks:    StateFlow<List<WatchTask>>         = WatchStateHolder.tasks.asStateFlow()
    val shopping: StateFlow<List<WatchShoppingItem>> = WatchStateHolder.shopping.asStateFlow()
    val habits:   StateFlow<List<WatchHabit>>        = WatchStateHolder.habits.asStateFlow()

    private val messageClient = Wearable.getMessageClient(application)
    private val nodeClient    = Wearable.getNodeClient(application)

    // --- mutations (optimistic local update + fire-and-forget to phone) ---

    fun toggleTask(id: String) {
        WatchStateHolder.tasks.update { list ->
            list.map { if (it.id == id) it.copy(done = !it.done) else it }
        }
        sendToPhone(WearPaths.TASK_TOGGLE, id)
    }

    fun toggleShoppingItem(id: String) {
        WatchStateHolder.shopping.update { list ->
            list.map { if (it.id == id) it.copy(checked = !it.checked) else it }
        }
        sendToPhone(WearPaths.SHOP_TOGGLE, id)
    }

    fun incrementHabit(id: String) {
        WatchStateHolder.habits.update { list ->
            list.map { if (it.id == id) it.copy(todayCount = it.todayCount + 1) else it }
        }
        sendToPhone(WearPaths.HABIT_INC, id)
    }

    fun decrementHabit(id: String) {
        WatchStateHolder.habits.update { list ->
            list.map { if (it.id == id && it.todayCount > 0) it.copy(todayCount = it.todayCount - 1) else it }
        }
        sendToPhone(WearPaths.HABIT_DEC, id)
    }

    private fun sendToPhone(path: String, payload: String) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val nodes = Tasks.await(nodeClient.connectedNodes)
                nodes.forEach { node ->
                    Tasks.await(messageClient.sendMessage(node.id, path, payload.toByteArray()))
                }
            } catch (_: Exception) {
                // Phone not reachable — mutation already applied locally; will reconcile on next snapshot
            }
        }
    }
}
