package com.freyrnorpixel.unfocuswear.data

data class WatchTask(
    val id: String,
    val title: String,
    val time: String?,          // "HH:MM" or null
    val importance: String,     // "regular" | "essential"
    val done: Boolean
)

data class WatchShoppingItem(
    val id: String,
    val name: String,
    val amount: String,
    val unit: String,
    val category: String,
    val checked: Boolean
)

data class WatchHabit(
    val id: String,
    val title: String,
    val icon: String,           // emoji
    val kind: String,           // "build" | "break"
    val dailyGoal: Int,
    val todayCount: Int
)

// Paths used over the Wearable Message/Data Layer
object WearPaths {
    const val SNAPSHOT    = "/unfocus/snapshot"   // phone → watch: full JSON payload
    const val TASK_TOGGLE = "/unfocus/task/toggle" // watch → phone: task id
    const val SHOP_TOGGLE = "/unfocus/shop/toggle" // watch → phone: item id
    const val HABIT_INC   = "/unfocus/habit/inc"   // watch → phone: habit id
    const val HABIT_DEC   = "/unfocus/habit/dec"   // watch → phone: habit id
}

// Demo seed data — replaced at runtime once the phone pushes a real snapshot
val demoTasks = listOf(
    WatchTask("t1", "Morning standup",    "09:00", "essential", false),
    WatchTask("t2", "Review pull requests","11:00", "regular",  false),
    WatchTask("t3", "Lunch walk",          "12:30", "regular",  true),
    WatchTask("t4", "Write weekly report", "15:00", "essential", false)
)

val demoShopping = listOf(
    WatchShoppingItem("s1", "Milk",   "1",   "liter", "dairy",   false),
    WatchShoppingItem("s2", "Eggs",   "12",  "pcs",   "dairy",   false),
    WatchShoppingItem("s3", "Bread",  "1",   "loaf",  "bread",   false),
    WatchShoppingItem("s4", "Apples", "6",   "pcs",   "produce", false),
    WatchShoppingItem("s5", "Pasta",  "500", "g",     "dry",     true)
)

val demoHabits = listOf(
    WatchHabit("h1", "Drink water",       "💧", "build", 8, 3),
    WatchHabit("h2", "Morning run",       "🏃", "build", 1, 0),
    WatchHabit("h3", "No social media",   "📵", "break", 1, 1),
    WatchHabit("h4", "In bed by 22:00",   "😴", "build", 1, 0)
)
