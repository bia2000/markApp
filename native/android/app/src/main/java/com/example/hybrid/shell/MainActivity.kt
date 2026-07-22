package com.example.hybrid.shell

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentStatePagerAdapter
import androidx.viewpager.widget.ViewPager
import com.example.hybrid.R
import com.example.hybrid.shell.tab.HomeWebFragment
import com.example.hybrid.shell.tab.CategoryWebFragment
import com.example.hybrid.shell.tab.MessageWebFragment
import com.example.hybrid.shell.tab.ProfileWebFragment
import com.google.android.material.bottomnavigation.BottomNavigationView

/**
 * 根 TabBar 容器：原生 BottomNavigationView + ViewPager
 * 每个 Tab 承载一个常驻 WebView Fragment
 */
class MainActivity : AppCompatActivity() {

    private lateinit var viewPager: ViewPager
    private lateinit var bottomNav: BottomNavigationView

    private val fragments = listOf(
        HomeWebFragment(),
        CategoryWebFragment(),
        MessageWebFragment(),
        ProfileWebFragment()
    )

    private val titles = arrayOf("首页", "分类", "消息", "我的")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        viewPager = findViewById(R.id.viewPager)
        bottomNav = findViewById(R.id.bottomNav)

        viewPager.adapter = TabPagerAdapter(supportFragmentManager)
        viewPager.offscreenPageLimit = fragments.size // 全部常驻，不销毁

        bottomNav.setOnNavigationItemSelectedListener { item ->
            when (item.itemId) {
                R.id.tab_home -> { viewPager.currentItem = 0; true }
                R.id.tab_category -> { viewPager.currentItem = 1; true }
                R.id.tab_message -> { viewPager.currentItem = 2; true }
                R.id.tab_profile -> { viewPager.currentItem = 3; true }
                else -> false
            }
        }

        viewPager.addOnPageChangeListener(object : ViewPager.SimpleOnPageChangeListener() {
            override fun onPageSelected(position: Int) {
                bottomNav.menu.getItem(position).isChecked = true
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
