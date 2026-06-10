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
import com.freyrnorpixel.unfocuswear.viewmodel.WatchViewModel

@Composable
fun ShoppingScreen(vm: WatchViewModel = viewModel()) {
    val items by vm.shopping.collectAsState()
    val listState = rememberScalingLazyListState()

    val pending  = items.filter { !it.checked }
    val bought   = items.filter {  it.checked }

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
                Text("Shopping", style = MaterialTheme.typography.title3)
            }

            items(pending, key = { it.id }) { item ->
                val label = if (item.amount.isNotBlank()) "${item.amount} ${item.unit}".trim()
                            else item.category
                Chip(
                    onClick  = { vm.toggleShoppingItem(item.id) },
                    modifier = Modifier.fillMaxWidth(),
                    label    = {
                        Text(
                            text     = item.name,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    secondaryLabel = { Text(label) },
                    icon           = { Text("□") },
                    colors         = ChipDefaults.chipColors()
                )
            }

            if (bought.isNotEmpty()) {
                item {
                    Text(
                        text  = "In cart",
                        style = MaterialTheme.typography.caption2,
                        color = MaterialTheme.colors.onBackground.copy(alpha = 0.5f)
                    )
                }
                items(bought, key = { it.id }) { item ->
                    Chip(
                        onClick  = { vm.toggleShoppingItem(item.id) },
                        modifier = Modifier.fillMaxWidth(),
                        label    = {
                            Text(
                                text           = item.name,
                                maxLines       = 1,
                                overflow       = TextOverflow.Ellipsis,
                                textDecoration = TextDecoration.LineThrough,
                                color          = MaterialTheme.colors.onSurface.copy(alpha = 0.4f)
                            )
                        },
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
