package com.freyrnorpixel.unfocuswear.presentation.screens

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.*
import com.freyrnorpixel.unfocuswear.presentation.theme.WarmAmber
import com.freyrnorpixel.unfocuswear.viewmodel.WatchViewModel

@Composable
fun TaskListScreen(vm: WatchViewModel = viewModel()) {
    val tasks by vm.tasks.collectAsState()
    val listState = rememberScalingLazyListState()

    val pending   = tasks.filter { !it.done }
    val completed = tasks.filter {  it.done }

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
                Text("Today", style = MaterialTheme.typography.title3)
            }

            items(pending, key = { it.id }) { task ->
                Chip(
                    onClick  = { vm.toggleTask(task.id) },
                    modifier = Modifier.fillMaxWidth(),
                    label    = {
                        Text(
                            text     = task.title,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            color    = if (task.importance == "essential") WarmAmber
                                       else MaterialTheme.colors.onSurface
                        )
                    },
                    secondaryLabel = task.time?.let { t -> { Text(t) } },
                    icon     = { Text("○") },
                    colors   = ChipDefaults.chipColors(
                        backgroundColor = if (task.importance == "essential")
                            MaterialTheme.colors.surface
                        else
                            MaterialTheme.colors.surface.copy(alpha = 0.7f)
                    )
                )
            }

            if (completed.isNotEmpty()) {
                item {
                    Text(
                        text  = "Done",
                        style = MaterialTheme.typography.caption2,
                        color = MaterialTheme.colors.onBackground.copy(alpha = 0.5f)
                    )
                }
                items(completed, key = { it.id }) { task ->
                    Chip(
                        onClick  = { vm.toggleTask(task.id) },
                        modifier = Modifier.fillMaxWidth(),
                        label    = {
                            Text(
                                text            = task.title,
                                maxLines        = 1,
                                overflow        = TextOverflow.Ellipsis,
                                textDecoration  = TextDecoration.LineThrough,
                                color           = MaterialTheme.colors.onSurface.copy(alpha = 0.4f)
                            )
                        },
                        secondaryLabel = task.time?.let { t -> { Text(t) } },
                        icon   = { Text("✓") },
                        colors = ChipDefaults.chipColors(
                            backgroundColor = MaterialTheme.colors.surface.copy(alpha = 0.3f)
                        )
                    )
                }
            }
        }
    }
}
