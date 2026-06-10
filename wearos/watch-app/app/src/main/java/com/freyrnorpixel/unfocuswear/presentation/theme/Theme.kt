package com.freyrnorpixel.unfocuswear.presentation.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.Colors
import androidx.wear.compose.material.MaterialTheme

// Warm palette mirroring the UnFocus phone app's "warm" theme
val WarmOrange  = Color(0xFFE07B39)
val WarmAmber   = Color(0xFFF4A261)
val WarmCream   = Color(0xFFF5E6D0)
val DarkBrown   = Color(0xFF1A1410)
val SurfaceBrown = Color(0xFF2A2018)
val ErrorRed    = Color(0xFFCF6679)

private val unfocusWearColors = Colors(
    primary         = WarmOrange,
    primaryVariant  = Color(0xFFC4622A),
    secondary       = WarmAmber,
    secondaryVariant = Color(0xFFD4823A),
    background      = DarkBrown,
    surface         = SurfaceBrown,
    error           = ErrorRed,
    onPrimary       = Color.White,
    onSecondary     = Color.Black,
    onBackground    = WarmCream,
    onSurface       = WarmCream,
    onError         = Color.Black
)

@Composable
fun UnFocusWearTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors = unfocusWearColors,
        content = content
    )
}
