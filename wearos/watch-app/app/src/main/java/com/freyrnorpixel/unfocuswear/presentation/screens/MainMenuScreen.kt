package com.freyrnorpixel.unfocuswear.presentation.screens

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavController
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.*
import com.freyrnorpixel.unfocuswear.Routes
import com.freyrnorpixel.unfocuswear.presentation.theme.WarmOrange

@Composable
fun MainMenuScreen(nav: NavController) {
    val listState = rememberScalingLazyListState()

    Scaffold(
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) },
        vignette           = { Vignette(vignettePosition = VignettePosition.TopAndBottom) },
        timeText           = { TimeText() }
    ) {
        ScalingLazyColumn(
            state               = listState,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item {
                Text(
                    text  = "UnFocus",
                    style = MaterialTheme.typography.title2,
                    color = WarmOrange
                )
            }

            item {
                Chip(
                    onClick  = { nav.navigate(Routes.TASKS) },
                    label    = { Text("Tasks") },
                    icon     = { Text("✓") },
                    modifier = Modifier.fillMaxWidth(),
                    colors   = ChipDefaults.primaryChipColors()
                )
            }

            item {
                Chip(
                    onClick  = { nav.navigate(Routes.SHOPPING) },
                    label    = { Text("Shopping") },
                    icon     = { Text("🛒") },
                    modifier = Modifier.fillMaxWidth(),
                    colors   = ChipDefaults.secondaryChipColors()
                )
            }

            item {
                Chip(
                    onClick  = { nav.navigate(Routes.HABITS) },
                    label    = { Text("Habits") },
                    icon     = { Text("🔥") },
                    modifier = Modifier.fillMaxWidth(),
                    colors   = ChipDefaults.secondaryChipColors()
                )
            }
        }
    }
}
