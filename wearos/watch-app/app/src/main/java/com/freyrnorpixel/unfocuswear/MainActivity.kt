package com.freyrnorpixel.unfocuswear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.freyrnorpixel.unfocuswear.presentation.screens.*
import com.freyrnorpixel.unfocuswear.presentation.theme.UnFocusWearTheme

object Routes {
    const val MENU     = "menu"
    const val TASKS    = "tasks"
    const val SHOPPING = "shopping"
    const val HABITS   = "habits"
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            UnFocusWearTheme {
                val nav = rememberSwipeDismissableNavController()
                SwipeDismissableNavHost(
                    navController   = nav,
                    startDestination = Routes.MENU
                ) {
                    composable(Routes.MENU)     { MainMenuScreen(nav) }
                    composable(Routes.TASKS)    { TaskListScreen() }
                    composable(Routes.SHOPPING) { ShoppingScreen() }
                    composable(Routes.HABITS)   { HabitScreen() }
                }
            }
        }
    }
}
