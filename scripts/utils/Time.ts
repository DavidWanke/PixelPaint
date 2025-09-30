import { system, TicksPerSecond } from "@minecraft/server";

export class Time {
  static TICKS_PER_SECOND = TicksPerSecond;
  static SECONDS_PER_MINUTE = 60;
  static MINUTES_PER_HOUR = 60;
  static HOURS_PER_DAY = 24;
  static TICKS_PER_MINECRAFT_DAY = 24000;
  static SECONDS_PER_MINECRAFT_DAY = Time.TICKS_PER_MINECRAFT_DAY / Time.TICKS_PER_SECOND;

  static secondsToTicks(seconds: number) {
    return seconds * Time.TICKS_PER_SECOND;
  }

  static ticksToSeconds(ticks: number) {
    return ticks / Time.TICKS_PER_SECOND;
  }

  static hoursToTicks(hours: number) {
    return hours * Time.MINUTES_PER_HOUR * Time.SECONDS_PER_MINUTE * Time.TICKS_PER_SECOND;
  }

  static ticksToHours(ticks: number) {
    return ticks / (Time.TICKS_PER_SECOND * Time.SECONDS_PER_MINUTE * Time.MINUTES_PER_HOUR);
  }

  static daysToTicks(days: number) {
    return days * Time.HOURS_PER_DAY * Time.MINUTES_PER_HOUR * Time.SECONDS_PER_MINUTE * Time.TICKS_PER_SECOND;
  }

  static ticksToDays(ticks: number) {
    return ticks / (Time.TICKS_PER_SECOND * Time.SECONDS_PER_MINUTE * Time.MINUTES_PER_HOUR * Time.HOURS_PER_DAY);
  }

  static minecraftDaysToTicks(minecraftDays: number) {
    return minecraftDays * Time.TICKS_PER_MINECRAFT_DAY;
  }

  static ticksToMinecraftDays(ticks: number) {
    return ticks / Time.TICKS_PER_MINECRAFT_DAY;
  }

  static isSameDay(ticks1: number, ticks2: number) {
    const day1 = Time.ticksToMinecraftDays(ticks1);
    const day2 = Time.ticksToMinecraftDays(ticks2);
    return Math.floor(day1) === Math.floor(day2);
  }

  static getStringFromSeconds(seconds: number) {
    const hours = Math.floor(seconds / Time.SECONDS_PER_MINUTE / Time.MINUTES_PER_HOUR);
    const minutes = Math.floor((seconds / Time.SECONDS_PER_MINUTE) % Time.MINUTES_PER_HOUR);
    const remainingSeconds = seconds % Time.SECONDS_PER_MINUTE;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  static shouldToggle(seconds: number) {
    return system.currentTick % Time.secondsToTicks(seconds) === 0;
  }
}
