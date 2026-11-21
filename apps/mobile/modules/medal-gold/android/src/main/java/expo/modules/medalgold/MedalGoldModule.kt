package expo.modules.medalgold

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorSpace
import android.graphics.Paint
import android.os.Build
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView

class MedalGoldModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OvertaekMedalGold")
    View(MedalGoldView::class) {
      Prop("channels") { view: MedalGoldView, channels: List<Double> ->
        view.setChannels(channels)
      }
    }
  }
}

class MedalGoldView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val paint = Paint()
  private var wideColor: Long? = null

  init {
    setWillNotDraw(false)
  }

  fun setChannels(channels: List<Double>) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && channels.size == 3) {
      wideColor = Color.pack(
        channels[0].toFloat(), channels[1].toFloat(), channels[2].toFloat(), 1f,
        ColorSpace.get(ColorSpace.Named.DISPLAY_P3)
      )
    }
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val color = wideColor ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        resources.configuration.isScreenWideColorGamut && canvas.isHardwareAccelerated) {
      paint.setColor(color)
      canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
    }
  }
}
