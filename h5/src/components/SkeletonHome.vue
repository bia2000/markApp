<template>
  <div class="skeleton-home">
    <!-- banner -->
    <div class="skeleton-home__banner skeleton-line" />
    <!-- entries -->
    <div class="skeleton-home__entries">
      <div v-for="i in 4" :key="i" class="skeleton-home__entry">
        <div
          class="skeleton-line"
          style="width: 48px; height: 48px; border-radius: 50%"
        />
        <div class="skeleton-line" style="width: 50px; margin-top: 8px" />
      </div>
    </div>
    <!-- feed -->
    <div class="skeleton-home__feed">
      <div v-for="i in 4" :key="i" class="skeleton-home__card">
        <div class="skeleton-line" style="width: 100%; height: 120px" />
        <div class="skeleton-line" style="width: 70%; margin-top: 10px" />
        <div class="skeleton-line" style="width: 40%; margin-top: 6px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.skeleton-home {
  padding: $spacing-lg;
  &__banner {
    width: 100%;
    height: 140px;
    border-radius: $radius-lg;
  }
  &__entries {
    display: flex;
    justify-content: space-around;
    margin: $spacing-lg 0;
    background: $color-background-light;
    padding: $spacing-lg;
    border-radius: $radius-lg;
  }
  &__entry {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  &__feed {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-md;
  }
  &__card {
    background: $color-background-light;
    padding: $spacing-md;
    border-radius: $radius-lg;
  }
}
</style>
