package com.freyrnorpixel.unfocuswear.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.*
import com.freyrnorpixel.unfocuswear.presentation.theme.WarmOrange
import com.freyrnorpixel.unfocuswear.viewmodel.WatchViewModel

@Composable
fun HabitScreen(vm: WatchViewModel = viewModel()) {
    val habits by vm.habits.collectAsState()
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
                Text("Habits", style = MaterialTheme.typography.title3)
            }

            items(habits, key = { it.id }) { habit ->
                val progress   = (habit.todayCount.toFloat() / habit.dailyGoal).coerceIn(0f, 1f)
                val isComplete = habit.todayCount >= habit.dailyGoal
                val countLabel = if (habit.dailyGoal > 1) "${habit.todayCount}/${habit.dailyGoal}"
                                 else if (isComplete) "Done" else "Tap to log"

                Card(
                    onClick   = { vm.incrementHabit(habit.id) },
                    modifier  = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier          = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Emoji icon
                        Text(
                            text     = habit.icon,
                            fontSize = 22.sp,
                            modifier = Modifier.padding(end = 8.dp)
                        )

                        // Title + count
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text     = habit.title,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                style    = MaterialTheme.typography.body1
                            )
                            Text(
                                text  = countLabel,
                                style = MaterialTheme.typography.caption2,
                                color = if (isComplete) WarmOrange
                                        else MaterialTheme.colors.onSurface.copy(alpha = 0.6f)
                            )
                        }

                        // Progress ring + decrement button
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                modifier          = Modifier.size(28.dp),
                                contentAlignment  = Alignment.Center
                            ) {
                                CircularProgressIndicator(
                                    progress    = progress,
                                    modifier    = Modifier.fillMaxSize(),
                                    strokeWidth = 3.dp,
                                    indicatorColor = if (isComplete) WarmOrange
                                                     else MaterialTheme.colors.secondary,
                                    trackColor  = MaterialTheme.colors.onSurface.copy(alpha = 0.15f)
                                )
                                if (isComplete) {
                                    Text("✓", fontSize = 12.sp, color = WarmOrange)
                                }
                            }
                            if (habit.todayCount > 0) {
                                CompactButton(
                                    onClick   = { vm.decrementHabit(habit.id) },
                                    modifier  = Modifier.size(24.dp)
                                ) {
                                    Text("−", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
