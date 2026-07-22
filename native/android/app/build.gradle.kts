plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.hybrid"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.hybrid"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        viewBinding = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.viewpager:viewpager:1.0.0")
    implementation("androidx.fragment:fragment-ktx:1.6.2")
    // WebView 池化、性能优化可选依赖
    // implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
