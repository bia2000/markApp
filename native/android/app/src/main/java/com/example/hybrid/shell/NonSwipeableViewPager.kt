package com.example.hybrid.shell

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import androidx.viewpager.widget.ViewPager

/**
 * 禁止左右滑动翻页的 ViewPager：仅允许通过代码（如 setCurrentItem）切换页面，
 * 滑动手势原样透传给内部 WebView（例如页面内的横向滚动），避免手势冲突。
 * 底部 TabBar 点击切换照常工作。
 */
class NonSwipeableViewPager @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : ViewPager(context, attrs) {

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean = false

    override fun onTouchEvent(ev: MotionEvent): Boolean = false
}
