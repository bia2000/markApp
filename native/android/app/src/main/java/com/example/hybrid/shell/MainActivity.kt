package com.example.hybrid.shell

import android.content.Intent
import android.graphics.Rect
import android.os.Bundle
import android.view.View
import android.view.ViewTreeObserver
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentStatePagerAdapter
import androidx.viewpager.widget.ViewPager
import com.example.hybrid.R
import com.example.hybrid.bridge.JSBridge
import com.example.hybrid.bridge.plugins.QUICK_ADD_ACTION
import com.example.hybrid.bridge.plugins.ShortcutState
import com.example.hybrid.shell.BaseWebFragment
import com.example.hybrid.shell.tab.HomeWebFragment
import com.example.hybrid.shell.tab.StatsWebFragment
import com.example.hybrid.shell.tab.SummaryWebFragment
import com.example.hybrid.shell.tab.GoalWebFragment
import com.google.android.material.bottomnavigation.BottomNavigationView

/**
 * 根 TabBar 容器：原生 BottomNavigationView + ViewPager
 * 每个 Tab 承载一个常驻 WebView Fragment
 */
class MainActivity : AppCompatActivity() {

    private lateinit var viewPager: NonSwipeableViewPager
    private lateinit var bottomNav: BottomNavigationView

    private val fragments = listOf(
        HomeWebFragment(),
        StatsWebFragment(),
        SummaryWebFragment(),
        GoalWebFragment()
    )

    private val titles = arrayOf("记事项", "统计", "总结", "每日计划")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        viewPager = findViewById(R.id.viewPager)
        bottomNav = findViewById(R.id.bottomNav)

        viewPager.adapter = TabPagerAdapter(supportFragmentManager)
        viewPager.offscreenPageLimit = fragments.size // 全部常驻，不销毁

        bottomNav.setOnNavigationItemSelectedListener { item ->
            val pos = when (item.itemId) {
                R.id.tab_home -> 0
                R.id.tab_stats -> 1
                R.id.tab_summary -> 2
                R.id.tab_goal -> 3
                else -> -1
            }
            if (pos >= 0) {
                viewPager.currentItem = pos
                // 切换 Tab 后通知对应 WebView 重新读取数据，保证统计页看到最新结果
                (fragments[pos] as? BaseWebFragment)?.resyncData()
                true
            } else false
        }

        viewPager.addOnPageChangeListener(object : ViewPager.SimpleOnPageChangeListener() {
            override fun onPageSelected(position: Int) {
                bottomNav.menu.getItem(position).isChecked = true
            }
        })

        // 软键盘弹出时隐藏原生底部 TabBar，避免其悬浮在键盘上方遮挡输入
        setupKeyboardListener()

        // 处理桌面快捷方式（快速记一笔）拉起
        handleQuickAddIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleQuickAddIntent(intent)
    }

    /**
     * 回到前台：触发首页重新从原生共享存储合并桌面组件点记录产生的数据
     * （桌面组件点击不打开 App，记录先落在原生，这里在 App 回到前台时拉取合并）。
     */
    override fun onResume() {
        super.onResume()
        (fragments[0] as? BaseWebFragment)?.resyncData()
    }

    /**
     * 解析桌面快捷方式 Intent：标记 pending 供 H5 冷启动后拉取，
     * 并立即向已就绪的 H5 派发 quick_add 事件（热启动路径）。
     */
    private fun handleQuickAddIntent(intent: Intent?) {
        if (intent?.action == QUICK_ADD_ACTION) {
            ShortcutState.pendingQuickAdd = true
            JSBridge.dispatchEvent("quick_add", null)
        }
    }

    /**
     * 监听软键盘可见性：键盘显示 -> 隐藏底部导航栏（释放空间，WebView 撑满），
     * 键盘收起 -> 恢复。避免 BottomNavigationView 固定底部而悬浮在输入法之上。
     */
    private fun setupKeyboardListener() {
        val root = findViewById<View>(android.R.id.content)
        root.viewTreeObserver.addOnGlobalLayoutListener(object : ViewTreeObserver.OnGlobalLayoutListener {
            private var lastVisible = false
            override fun onGlobalLayout() {
                val rect = Rect()
                root.getWindowVisibleDisplayFrame(rect)
                val screenHeight = root.rootView.height
                val keypadHeight = screenHeight - rect.bottom
                // 高度差超过屏幕 15% 视为键盘弹出（过滤系统栏等误判）
                val isKeyboardVisible = keypadHeight > screenHeight * 0.15
                if (isKeyboardVisible != lastVisible) {
                    lastVisible = isKeyboardVisible
                    bottomNav.visibility = if (isKeyboardVisible) View.GONE else View.VISIBLE
                }
            }
        })
    }

    private inner class TabPagerAdapter(fm: FragmentManager) :
        FragmentStatePagerAdapter(fm, BEHAVIOR_RESUME_ONLY_CURRENT_FRAGMENT) {

        override fun getItem(position: Int): Fragment = fragments[position]
        override fun getCount(): Int = fragments.size
        override fun getPageTitle(position: Int): CharSequence = titles[position]
    }
}
