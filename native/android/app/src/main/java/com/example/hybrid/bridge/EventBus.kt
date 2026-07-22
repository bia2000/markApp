package com.example.hybrid.bridge

/**
 * 原生事件总线：广播全局事件到 H5
 */
object EventBus {
    fun dispatch(event: String, data: Any? = null) {
        JSBridge.dispatchEvent(event, data)
    }
}
