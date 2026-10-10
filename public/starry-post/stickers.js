(function(global) {
  "use strict";
  const C = {
    star: "#f2cf72",
    starDeep: "#dcae3f",
    butter: "#f2dc9b",
    night: "#2c3e63",
    ice: "#a9c9dd",
    deep: "#1b2a4a",
    sky: "#7fb2e0",
    olive: "#7d8b5a",
    forest: "#3f5c47",
    green: "#6f9a5e",
    mint: "#a8c8a0",
    brown: "#6b4f3a",
    clay: "#b9714f",
    terra: "#c1764a",
    sand: "#d9b98a",
    maroon: "#7a3b45",
    rose: "#e0a0ad",
    pink: "#efb8c8",
    plum: "#5b3a66",
    cream: "#f6ecd8",
    white: "#fdf8ee",
    grey: "#9aa3b2",
    teal: "#5f9ea0",
    lilac: "#b9a3d4",
    coral: "#e8846b"
  };
  const SHEET = [
    /* ═══════════════ the sky ═══════════════ */
    { id: "star", label: "star", cat: "sky", tags: "twinkle night shine vangogh", svg: `
    <circle cx="24" cy="24" r="13" fill="${C.star}" opacity=".26"/>
    <path d="M24 5c1.6 9.4 9 16.8 18.4 18.4C33 25 25.6 32.4 24 41.8 22.4 32.4 15 25 5.6 23.4 15 21.8 22.4 14.4 24 5z" fill="${C.star}"/>
    <circle cx="24" cy="24" r="3.6" fill="${C.white}"/>` },
    { id: "star5", label: "a proper star", cat: "sky", tags: "five point twinkle gold", svg: `
    <path d="M24 5l5.6 12.4 13.4 1.6-10 9.2 2.7 13.3L24 34.9 12.3 41.5 15 28.2 5 19l13.4-1.6z" fill="${C.star}"/>
    <path d="M24 11l3.4 7.6 8.2 1-6.1 5.6 1.6 8.1L24 29.3l-7.1 4-6.1-5.6 8.2-1z" fill="${C.butter}" opacity=".55"/>` },
    { id: "moon", label: "crescent", cat: "sky", tags: "night chand moon sleep", svg: `
    <path d="M24 9A15 15 0 0 0 24 39A21 21 0 0 1 24 9Z" fill="${C.star}"/>
    <circle cx="17" cy="19" r="1.7" fill="${C.white}" opacity=".55"/>
    <circle cx="14" cy="27" r="1.1" fill="${C.white}" opacity=".4"/>` },
    { id: "fullmoon", label: "full moon", cat: "sky", tags: "chand round night", svg: `
    <circle cx="24" cy="24" r="15" fill="${C.star}"/>
    <circle cx="18" cy="19" r="3.2" fill="${C.starDeep}" opacity=".35"/>
    <circle cx="29" cy="27" r="2.4" fill="${C.starDeep}" opacity=".3"/>
    <circle cx="22" cy="31" r="1.8" fill="${C.starDeep}" opacity=".25"/>` },
    { id: "swirl", label: "swirl", cat: "sky", tags: "vangogh wind spiral starry", svg: `
    <path d="M6 30c0-11 9-20 20-20s16 7 16 14-5 12-11 12-9-4-9-8 3-7 6-7 5 2 5 5" fill="none" stroke="${C.ice}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M6 38c4-6 11-9 17-8" fill="none" stroke="${C.ice}" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>` },
    { id: "cloud", label: "cotton candy", cat: "sky", tags: "cloud pink fluffy wall", svg: `
    <ellipse cx="18" cy="28" rx="11" ry="9" fill="${C.pink}"/>
    <ellipse cx="30" cy="26" rx="10" ry="8.5" fill="${C.rose}"/>
    <ellipse cx="24" cy="21" rx="9" ry="8" fill="${C.white}"/>
    <ellipse cx="14" cy="24" rx="6" ry="5.4" fill="${C.white}" opacity=".85"/>` },
    { id: "raincloud", label: "rain", cat: "sky", tags: "barish cloud weather drops", svg: `
    <ellipse cx="20" cy="20" rx="11" ry="8" fill="${C.grey}"/>
    <ellipse cx="31" cy="21" rx="8" ry="6.4" fill="${C.ice}"/>
    <g stroke="${C.sky}" stroke-width="2.6" stroke-linecap="round">
      <path d="M16 31l-2 8"/><path d="M24 31l-2 9"/><path d="M32 31l-2 7"/></g>` },
    { id: "cypress", label: "cypress", cat: "sky", tags: "tree vangogh dark green", svg: `
    <path d="M24 3c4 6 7 13 7 22s-3 15-7 20c-4-5-7-11-7-20s3-16 7-22z" fill="${C.forest}"/>
    <path d="M24 9c2 5 3.4 9 3.4 15S26 35 24 39c-2-4-3.4-9-3.4-15S22 14 24 9z" fill="${C.deep}" opacity=".45"/>
    <rect x="22.4" y="40" width="3.2" height="6" rx="1.4" fill="${C.brown}"/>` },
    { id: "mountain", label: "mountains", cat: "sky", tags: "murree nathia pahar hills sacha pyaar", svg: `
    <path d="M2 41 16 17l8 12 4-6 6 9 12 9z" fill="${C.ice}" opacity=".5"/>
    <path d="M2 41 18 14l10 15 5-7 13 19z" fill="${C.night}"/>
    <path d="M18 14l5.8 8.6a9 9 0 0 1-5.8-1 9 9 0 0 1-5.8 1z" fill="${C.white}" opacity=".92"/>
    <path d="M33 22l3.6 5.2a7 7 0 0 1-7.2 0z" fill="${C.white}" opacity=".78"/>
    <rect x="2" y="41" width="44" height="3.4" rx="1.6" fill="${C.deep}" opacity=".55"/>` },
    { id: "masjid", label: "masjid", cat: "sky", tags: "mosque namaz dome minaret deen", svg: `
    <path d="M11 42V26a13 13 0 0 1 26 0v16z" fill="${C.night}"/>
    <path d="M24 9c4.6 4 7 7.6 7 11.4a7 7 0 0 1-14 0C17 16.6 19.4 13 24 9z" fill="${C.night}"/>
    <path d="M24 4.4 25.4 8h-2.8z" fill="${C.star}"/>
    <rect x="7" y="20" width="2.8" height="22" rx="1.4" fill="${C.night}"/>
    <rect x="38.2" y="20" width="2.8" height="22" rx="1.4" fill="${C.night}"/>
    <path d="M21 42v-8a3 3 0 0 1 6 0v8z" fill="${C.star}" opacity=".85"/>` },
    { id: "sun", label: "sun", cat: "sky", tags: "sunshine day warm hot", svg: `
    <circle cx="24" cy="24" r="9.5" fill="${C.star}"/>
    <g stroke="${C.starDeep}" stroke-width="2.8" stroke-linecap="round">
      <path d="M24 5.5v4M24 38.5v4M5.5 24h4M38.5 24h4M11 11l2.8 2.8M34.2 34.2 37 37M37 11l-2.8 2.8M13.8 34.2 11 37"/></g>` },
    { id: "sunset", label: "sunset", cat: "sky", tags: "paint sky evening ocean orange", svg: `
    <path d="M6 26a18 18 0 0 1 36 0z" fill="${C.coral}"/>
    <circle cx="24" cy="26" r="8.5" fill="${C.star}"/>
    <rect x="4" y="26" width="40" height="4" rx="2" fill="${C.sky}" opacity=".8"/>
    <rect x="4" y="32" width="40" height="3.4" rx="1.7" fill="${C.sky}" opacity=".6"/>
    <rect x="4" y="38" width="40" height="3" rx="1.5" fill="${C.sky}" opacity=".42"/>` },
    { id: "rainbow", label: "rainbow", cat: "sky", tags: "colours arc after rain", svg: `
    <g fill="none" stroke-width="4" stroke-linecap="round">
      <path d="M6 38a18 18 0 0 1 36 0" stroke="${C.coral}"/>
      <path d="M11 38a13 13 0 0 1 26 0" stroke="${C.star}"/>
      <path d="M16 38a8 8 0 0 1 16 0" stroke="${C.mint}"/>
      <path d="M21 38a3 3 0 0 1 6 0" stroke="${C.sky}"/></g>` },
    { id: "comet", label: "comet", cat: "sky", tags: "shooting star wish night", svg: `
    <path d="M40 10 14 34" stroke="${C.ice}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".6"/>
    <path d="M34 10 12 28" stroke="${C.ice}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".4"/>
    <circle cx="38" cy="12" r="5" fill="${C.star}"/>` },
    { id: "planet", label: "planet", cat: "sky", tags: "saturn space astronomy ring", svg: `
    <circle cx="24" cy="23" r="11" fill="${C.lilac}"/>
    <path d="M24 16a11 11 0 0 1 0 14" fill="none" stroke="${C.plum}" stroke-width="2" opacity=".3"/>
    <ellipse cx="24" cy="25" rx="21" ry="5.5" fill="none" stroke="${C.star}" stroke-width="3" transform="rotate(-18 24 25)"/>` },
    { id: "constellation", label: "joining dots", cat: "sky", tags: "stars lines pattern terrace", svg: `
    <g stroke="${C.ice}" stroke-width="1.6" fill="none" opacity=".75">
      <path d="M10 14 22 22 18 34 33 30 38 15 22 22"/></g>
    <g fill="${C.star}">
      <circle cx="10" cy="14" r="3"/><circle cx="22" cy="22" r="3.6"/>
      <circle cx="18" cy="34" r="2.6"/><circle cx="33" cy="30" r="3"/>
      <circle cx="38" cy="15" r="2.4"/></g>` },
    { id: "snowflake", label: "snow", cat: "sky", tags: "winter cold murree barf", svg: `
    <g stroke="${C.ice}" stroke-width="2.4" stroke-linecap="round">
      <path d="M24 6v36M8.4 15 39.6 33M8.4 33 39.6 15"/>
      <path d="M24 12l-4-4M24 12l4-4M24 36l-4 4M24 36l4 4"/>
      <path d="M14 20l-5.4.4M14 20l-.6-5.4M34 28l5.4-.4M34 28l.6 5.4"/></g>` },
    { id: "lightning", label: "load shedding", cat: "sky", tags: "bolt electric power bijli", svg: `
    <path d="M27 4 12 27h9l-3 17 17-24h-9z" fill="${C.star}"/>
    <path d="M25 9 16 25h7l-1.6 9 9-13h-7z" fill="${C.butter}" opacity=".6"/>` },
    /* ═══════════════ the garden ═══════════════ */
    { id: "jhumka", label: "jhumka vine", cat: "garden", tags: "flower pink hanging", svg: `
    <path d="M24 3v14M24 17c-5 1-8 5-8 9M24 17c5 1 8 5 8 9" fill="none" stroke="${C.green}" stroke-width="2.4" stroke-linecap="round"/>
    <g fill="${C.pink}">
      <path d="M16 26c3 0 5 3 5 6s-2 6-5 6-5-3-5-6 2-6 5-6z"/>
      <path d="M32 26c3 0 5 3 5 6s-2 6-5 6-5-3-5-6 2-6 5-6z"/>
      <path d="M24 30c2.6 0 4.4 2.6 4.4 5.4S26.6 41 24 41s-4.4-2.6-4.4-5.4S21.4 30 24 30z" fill="${C.rose}"/></g>
    <circle cx="16" cy="29" r="1.4" fill="${C.white}" opacity=".7"/>` },
    { id: "raatkirani", label: "raat ki rani", cat: "garden", tags: "jasmine night flower white smell", svg: `
    <path d="M24 44V22M24 26l-8-6M24 30l8-6" fill="none" stroke="${C.forest}" stroke-width="2.2" stroke-linecap="round"/>
    <g fill="${C.white}">
      <path d="M24 10a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/>
      <path d="M14 16a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z"/>
      <path d="M34 16a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z"/></g>
    <circle cx="24" cy="14" r="1.6" fill="${C.butter}"/>
    <circle cx="14" cy="19.4" r="1.2" fill="${C.butter}"/>
    <circle cx="34" cy="19.4" r="1.2" fill="${C.butter}"/>` },
    { id: "pomegranate", label: "pomegranate", cat: "garden", tags: "anar fruit red the garden tree", svg: `
    <path d="M24 12c9 0 15 7 15 16S33 44 24 44 9 37 9 28s6-16 15-16z" fill="${C.maroon}"/>
    <path d="M24 12c-3 0-5-2-5-5l3 2 2-4 2 4 3-2c0 3-2 5-5 5z" fill="${C.forest}"/>
    <g fill="${C.rose}" opacity=".85">
      <circle cx="19" cy="26" r="2.2"/><circle cx="26" cy="24" r="2.2"/>
      <circle cx="30" cy="30" r="2.2"/><circle cx="21" cy="33" r="2.2"/>
      <circle cx="27" cy="35" r="2"/></g>` },
    { id: "jamun", label: "jamun", cat: "garden", tags: "fruit purple the garden tree", svg: `
    <path d="M20 16c3-5 9-5 12 0 3 5 2 14-2 20-2 3-6 3-8 0-4-6-5-15-2-20z" fill="${C.plum}"/>
    <path d="M26 16c-2-5-7-8-12-7 1 5 5 8 12 7z" fill="${C.forest}"/>
    <path d="M23 21c-1.4 3-1.6 8-.6 12" fill="none" stroke="${C.white}" stroke-width="1.6" stroke-linecap="round" opacity=".4"/>` },
    { id: "leaf", label: "pressed leaf", cat: "garden", tags: "plant green autumn keepsake", svg: `
    <path d="M38 8C22 8 10 18 10 31c0 4 2 7 4 9 12 0 26-12 26-28 0-1.6 0-3-2-4z" fill="${C.olive}"/>
    <path d="M37 10C28 20 20 30 14 40" fill="none" stroke="${C.forest}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M30 14l-6 2M32 20l-7 2M28 26l-7 2" fill="none" stroke="${C.forest}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>` },
    { id: "sunflower", label: "sunflower", cat: "garden", tags: "flower yellow vangogh tall", svg: `
    <g fill="${C.star}">
      <ellipse cx="24" cy="9" rx="4" ry="7"/><ellipse cx="24" cy="33" rx="4" ry="7"/>
      <ellipse cx="12" cy="21" rx="7" ry="4"/><ellipse cx="36" cy="21" rx="7" ry="4"/>
      <ellipse cx="15.5" cy="12.5" rx="4" ry="6.4" transform="rotate(-45 15.5 12.5)"/>
      <ellipse cx="32.5" cy="12.5" rx="4" ry="6.4" transform="rotate(45 32.5 12.5)"/>
      <ellipse cx="15.5" cy="29.5" rx="4" ry="6.4" transform="rotate(45 15.5 29.5)"/>
      <ellipse cx="32.5" cy="29.5" rx="4" ry="6.4" transform="rotate(-45 32.5 29.5)"/></g>
    <circle cx="24" cy="21" r="7.4" fill="${C.brown}"/>
    <circle cx="24" cy="21" r="4" fill="${C.deep}" opacity=".35"/>
    <path d="M24 29v16" fill="none" stroke="${C.green}" stroke-width="2.6" stroke-linecap="round"/>` },
    { id: "rose", label: "rose", cat: "garden", tags: "flower red love gulab", svg: `
    <path d="M24 26v18" stroke="${C.green}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M24 34c-5 0-8-3-9-7 5-1 8 2 9 7z" fill="${C.forest}"/>
    <circle cx="24" cy="18" r="11" fill="${C.maroon}"/>
    <path d="M24 10a8 8 0 1 1-.1 16 6 6 0 1 0 .1-12 4 4 0 1 1 0 8" fill="none" stroke="${C.rose}" stroke-width="1.8" stroke-linecap="round"/>` },
    { id: "tulip", label: "tulip", cat: "garden", tags: "flower spring pink", svg: `
    <path d="M24 24v20" stroke="${C.green}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M24 34c-6 0-9-4-10-9 6 0 9 4 10 9z" fill="${C.green}"/>
    <path d="M14 14c0-4 4-8 10-8s10 4 10 8c0 7-4 12-10 12S14 21 14 14z" fill="${C.rose}"/>
    <path d="M24 6c-2 4-3 12 0 20 3-8 2-16 0-20z" fill="${C.pink}" opacity=".7"/>` },
    { id: "daisy", label: "daisy", cat: "garden", tags: "flower white simple field", svg: `
    <path d="M24 26v18" stroke="${C.green}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <g fill="${C.white}">
      <ellipse cx="24" cy="10" rx="3.4" ry="6"/><ellipse cx="24" cy="26" rx="3.4" ry="6"/>
      <ellipse cx="16" cy="18" rx="6" ry="3.4"/><ellipse cx="32" cy="18" rx="6" ry="3.4"/>
      <ellipse cx="18.4" cy="12.4" rx="3.4" ry="5.4" transform="rotate(-45 18.4 12.4)"/>
      <ellipse cx="29.6" cy="12.4" rx="3.4" ry="5.4" transform="rotate(45 29.6 12.4)"/>
      <ellipse cx="18.4" cy="23.6" rx="3.4" ry="5.4" transform="rotate(45 18.4 23.6)"/>
      <ellipse cx="29.6" cy="23.6" rx="3.4" ry="5.4" transform="rotate(-45 29.6 23.6)"/></g>
    <circle cx="24" cy="18" r="5" fill="${C.star}"/>` },
    { id: "cactus", label: "cactus", cat: "garden", tags: "plant desert prickly pot", svg: `
    <path d="M20 40V18a4 4 0 0 1 8 0v22z" fill="${C.green}"/>
    <path d="M20 26h-4a4 4 0 0 1-4-4v-3" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round"/>
    <path d="M28 30h4a4 4 0 0 0 4-4v-5" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round"/>
    <path d="M14 40h20l-1.6 5H15.6z" fill="${C.clay}"/>
    <rect x="12" y="37" width="24" height="4.4" rx="2" fill="${C.terra}"/>` },
    { id: "mushroom", label: "mushroom", cat: "garden", tags: "toadstool forest cute red", svg: `
    <path d="M9 24a15 15 0 0 1 30 0z" fill="${C.maroon}"/>
    <g fill="${C.white}" opacity=".9">
      <circle cx="17" cy="18" r="2.6"/><circle cx="26" cy="14" r="2"/>
      <circle cx="32" cy="20" r="2.2"/><circle cx="22" cy="21" r="1.6"/></g>
    <path d="M19 24h10v12a5 5 0 0 1-10 0z" fill="${C.cream}"/>` },
    { id: "clover", label: "four leaf", cat: "garden", tags: "luck clover green pixey dust", svg: `
    <path d="M25 26c2 6 3 12 2 18" stroke="${C.forest}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g fill="${C.green}">
      <path d="M24 24c-6-2-10-6-8-10s7-2 8 4c1-6 6-8 8-4s-2 8-8 10z"/>
      <path d="M24 24c-6 2-10 6-8 10s7 2 8-4c1 6 6 8 8 4s-2-8-8-10z"/></g>
    <circle cx="24" cy="24" r="2" fill="${C.forest}"/>` },
    { id: "sprout", label: "a new thing", cat: "garden", tags: "sprout grow plant start seed", svg: `
    <path d="M24 44V22" stroke="${C.green}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M24 26c-8 0-12-5-12-11 8-1 12 4 12 11z" fill="${C.mint}"/>
    <path d="M24 30c8 0 12-5 12-11-8-1-12 4-12 11z" fill="${C.green}"/>
    <path d="M14 44h20" stroke="${C.brown}" stroke-width="3" stroke-linecap="round" fill="none"/>` },
    { id: "pot", label: "potted plant", cat: "garden", tags: "plant home pot leaves roombody", svg: `
    <g fill="${C.green}">
      <path d="M24 26c-7-1-11-6-10-12 7-1 11 4 10 12z"/>
      <path d="M24 26c7-1 11-6 10-12-7-1-11 4-10 12z"/>
      <path d="M24 26V8" stroke="${C.forest}" stroke-width="2" stroke-linecap="round"/></g>
    <path d="M12 27h24l-2.6 15a3 3 0 0 1-3 2.4H17.6a3 3 0 0 1-3-2.4z" fill="${C.clay}"/>
    <rect x="10" y="24" width="28" height="5.4" rx="2.4" fill="${C.terra}"/>` },
    { id: "butterfly", label: "butterfly", cat: "garden", tags: "titli wings summer", svg: `
    <path d="M23 24C16 12 6 12 5 19s8 13 18 7z" fill="${C.coral}"/>
    <path d="M25 24c7-12 17-12 18-5s-8 13-18 7z" fill="${C.coral}"/>
    <path d="M23 25c-6 5-12 9-14 5s4-9 14-7z" fill="${C.star}"/>
    <path d="M25 25c6 5 12 9 14 5s-4-9-14-7z" fill="${C.star}"/>
    <ellipse cx="24" cy="26" rx="2.2" ry="9" fill="${C.deep}"/>
    <path d="M22.4 17c-1-2.6-2.6-4-4.4-4.6M25.6 17c1-2.6 2.6-4 4.4-4.6" fill="none" stroke="${C.deep}" stroke-width="1.4" stroke-linecap="round"/>` },
    { id: "bee", label: "bee", cat: "garden", tags: "honey buzz insect yellow", svg: `
    <ellipse cx="14" cy="18" rx="8" ry="5" fill="${C.white}" opacity=".85" transform="rotate(-24 14 18)"/>
    <ellipse cx="32" cy="18" rx="8" ry="5" fill="${C.white}" opacity=".85" transform="rotate(24 32 18)"/>
    <ellipse cx="24" cy="28" rx="10" ry="12" fill="${C.star}"/>
    <g fill="${C.deep}">
      <path d="M15.4 24h17.2q.6 2 .8 4H14.6q.2-2 .8-4z"/>
      <path d="M15.6 32h16.8q-.8 2.4-2 4H17.6q-1.2-1.6-2-4z"/></g>
    <circle cx="24" cy="18" r="4.6" fill="${C.deep}"/>` },
    { id: "ladybug", label: "ladybug", cat: "garden", tags: "insect red dots luck", svg: `
    <ellipse cx="24" cy="27" rx="15" ry="14" fill="${C.maroon}"/>
    <path d="M24 13v28" stroke="${C.deep}" stroke-width="2.4" fill="none"/>
    <circle cx="24" cy="15" r="6.4" fill="${C.deep}"/>
    <g fill="${C.deep}">
      <circle cx="16" cy="24" r="2.6"/><circle cx="32" cy="24" r="2.6"/>
      <circle cx="18" cy="33" r="2.2"/><circle cx="30" cy="33" r="2.2"/></g>` },
    { id: "snail", label: "snail", cat: "garden", tags: "slow shell garden cute", svg: `
    <path d="M6 36h10c0-6 2-9 6-9" fill="none" stroke="${C.sand}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="28" cy="25" r="13" fill="${C.clay}"/>
    <path d="M28 25a7 7 0 1 0 6 4" fill="none" stroke="${C.cream}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M16 29v-6M20 29v-8" stroke="${C.sand}" stroke-width="2" stroke-linecap="round" fill="none"/>
    <circle cx="16" cy="21" r="1.8" fill="${C.deep}"/><circle cx="20" cy="19" r="1.8" fill="${C.deep}"/>` },
    /* ═══════════════ fud ═══════════════ */
    { id: "chai", label: "chai", cat: "fud", tags: "tea terrace hot drink coffee cup", svg: `
    <path d="M11 20h24v10a12 12 0 0 1-24 0z" fill="${C.white}"/>
    <path d="M35 22h4a4.6 4.6 0 0 1 0 9.2h-4" fill="none" stroke="${C.white}" stroke-width="3"/>
    <path d="M13 22h20v8a10 10 0 0 1-20 0z" fill="${C.clay}" opacity=".85"/>
    <ellipse cx="23" cy="43" rx="17" ry="3.4" fill="${C.white}" opacity=".9"/>
    <path d="M18 14c0-3 3-3 3-6M25 13c0-3 3-3 3-6" fill="none" stroke="${C.ice}" stroke-width="2" stroke-linecap="round" opacity=".8"/>` },
    { id: "mug", label: "the big mug", cat: "fud", tags: "cup coffee tea big over small", svg: `
    <path d="M9 12h26v24a7 7 0 0 1-7 7H16a7 7 0 0 1-7-7z" fill="${C.ice}"/>
    <path d="M35 17h4.5a6 6 0 0 1 0 12H35" fill="none" stroke="${C.ice}" stroke-width="3.4"/>
    <path d="M9 12h26v5H9z" fill="${C.white}" opacity=".7"/>
    <path d="M16 24c2 2 4 2 6 0s4-2 6 0" fill="none" stroke="${C.night}" stroke-width="2" stroke-linecap="round" opacity=".55"/>` },
    { id: "dumplings", label: "dumplings", cat: "fud", tags: "momo peak crown food dim sum", svg: `
    <g fill="${C.cream}" stroke="${C.brown}" stroke-width="1.4">
      <path d="M6 34c0-6 4-10 9-10s9 4 9 10c0 2-1 3-3 3H9c-2 0-3-1-3-3z"/>
      <path d="M24 34c0-6 4-10 9-10s9 4 9 10c0 2-1 3-3 3H27c-2 0-3-1-3-3z"/>
      <path d="M15 22c0-6 4-10 9-10s9 4 9 10c0 2-1 3-3 3H18c-2 0-3-1-3-3z"/></g>
    <path d="M17 13.6q3 3 6 0q3 3 6 0" fill="none" stroke="${C.brown}" stroke-width="1.4" stroke-linecap="round"/>` },
    { id: "pasta", label: "drowning in sauce", cat: "fud", tags: "spaghetti marinara bolognese italian", svg: `
    <path d="M6 26h36a18 18 0 0 1-36 0z" fill="${C.white}"/>
    <path d="M9 26h30a15 15 0 0 1-30 0z" fill="${C.terra}"/>
    <g fill="none" stroke="${C.butter}" stroke-width="2.2" stroke-linecap="round">
      <path d="M14 27c2 4 5 6 9 6"/><path d="M22 27c2 4 6 5 10 3"/><path d="M17 24c4 2 9 2 13 0"/></g>
    <ellipse cx="24" cy="24.6" rx="18" ry="3" fill="${C.white}" opacity=".5"/>` },
    { id: "biryani", label: "beef pulao", cat: "fud", tags: "rice biryani pk food plate desi", svg: `
    <ellipse cx="24" cy="32" rx="19" ry="9" fill="${C.white}"/>
    <path d="M8 30c0-7 7-12 16-12s16 5 16 12z" fill="${C.sand}"/>
    <g fill="${C.clay}">
      <ellipse cx="18" cy="25" rx="3.4" ry="2.6" transform="rotate(-20 18 25)"/>
      <ellipse cx="29" cy="24" rx="3.4" ry="2.6" transform="rotate(15 29 24)"/>
      <ellipse cx="24" cy="28" rx="3" ry="2.4"/></g>
    <g fill="${C.maroon}"><circle cx="14" cy="27" r="1.6"/><circle cx="34" cy="27" r="1.6"/></g>` },
    { id: "pizza", label: "pizza", cat: "fud", tags: "slice cheese italian movie night", svg: `
    <path d="M24 6 42 38a2 2 0 0 1-2 3H8a2 2 0 0 1-2-3z" fill="${C.butter}"/>
    <path d="M24 12 37 37H11z" fill="${C.terra}"/>
    <g fill="${C.maroon}"><circle cx="24" cy="24" r="2.6"/><circle cx="18" cy="31" r="2.4"/><circle cx="30" cy="31" r="2.4"/></g>
    <path d="M6 38h36" stroke="${C.sand}" stroke-width="4" stroke-linecap="round" fill="none"/>` },
    { id: "cookie", label: "cookie", cat: "fud", tags: "biscuit chocolate chip snack", svg: `
    <circle cx="24" cy="24" r="17" fill="${C.sand}"/>
    <g fill="${C.brown}">
      <circle cx="18" cy="18" r="2.8"/><circle cx="30" cy="20" r="2.4"/>
      <circle cx="22" cy="29" r="2.6"/><circle cx="31" cy="30" r="2.2"/>
      <circle cx="14" cy="27" r="1.8"/></g>` },
    { id: "cake", label: "cake", cat: "fud", tags: "birthday december 28 candle slice", svg: `
    <path d="M9 24h30v14a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" fill="${C.cream}"/>
    <path d="M9 24c0-4 7-6 15-6s15 2 15 6c0 3-7 4-15 4s-15-1-15-4z" fill="${C.rose}"/>
    <path d="M9 32q5 3 10 0t10 0t10 0" fill="none" stroke="${C.rose}" stroke-width="2.4"/>
    <rect x="22.6" y="8" width="2.8" height="10" rx="1.4" fill="${C.sky}"/>
    <path d="M24 4c2 2 2 4 0 4s-2-2 0-4z" fill="${C.star}"/>` },
    { id: "cupcake", label: "cupcake", cat: "fud", tags: "muffin sweet frosting", svg: `
    <path d="M13 24h22l-2.6 16a3 3 0 0 1-3 2.6H18.6a3 3 0 0 1-3-2.6z" fill="${C.sand}"/>
    <g stroke="${C.clay}" stroke-width="1.4" opacity=".55"><path d="M19 27l-1 13M24 27v13M29 27l1 13"/></g>
    <path d="M12 24c0-8 5-12 12-12s12 4 12 12z" fill="${C.pink}"/>
    <circle cx="24" cy="9" r="2.6" fill="${C.maroon}"/>` },
    { id: "donut", label: "salted caramel", cat: "fud", tags: "doughnut sweet glaze sprinkles", svg: `
    <circle cx="24" cy="24" r="17" fill="${C.butter}"/>
    <path d="M24 7a17 17 0 0 1 0 34 17 17 0 0 1 0-34zm0 5.5a11.5 11.5 0 1 0 0 23 11.5 11.5 0 0 0 0-23z" fill="${C.clay}"/>
    <circle cx="24" cy="24" r="6" fill="${C.cream}"/>
    <g stroke="${C.white}" stroke-width="2" stroke-linecap="round">
      <path d="M15 15l2-2"/><path d="M33 16l-2-2"/><path d="M15 33l2 2"/><path d="M33 32l-2 2"/><path d="M24 9v2.5"/></g>` },
    { id: "icecream", label: "over-hated vanilla", cat: "fud", tags: "cone dessert cold brownies", svg: `
    <path d="M17 22h14l-5 20a2 2 0 0 1-4 0z" fill="${C.butter}"/>
    <g stroke="${C.clay}" stroke-width="1.2" opacity=".6"><path d="M18.6 26h10.8M19.6 31h8.8M20.6 36h6.8"/></g>
    <circle cx="24" cy="16" r="9" fill="${C.cream}"/>
    <circle cx="18.5" cy="18" r="6" fill="${C.white}"/>
    <circle cx="29" cy="18.5" r="5.4" fill="${C.white}" opacity=".9"/>
    <circle cx="24" cy="8.6" r="2.2" fill="${C.maroon}"/>` },
    { id: "matcha", label: "secretly matcha", cat: "fud", tags: "green tea grass peer pressure", svg: `
    <path d="M13 16h22l-2.4 22a5 5 0 0 1-5 4.4h-7.2a5 5 0 0 1-5-4.4z" fill="${C.white}"/>
    <path d="M14.4 19h19.2l-.9 8H15.3z" fill="${C.green}"/>
    <ellipse cx="24" cy="19" rx="9.6" ry="2.4" fill="${C.olive}"/>
    <path d="M20 12c0-3 4-3 4-6M27 13c0-2.4 3-2.4 3-5" fill="none" stroke="${C.ice}" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>` },
    { id: "chopper", label: "LOML", cat: "fud", tags: "onion chopper appliance kitchen love of my life", svg: `
    <path d="M11 27h26v6a13 13 0 0 1-26 0z" fill="${C.ice}" opacity=".6"/>
    <g stroke="${C.night}" stroke-width="2.2" stroke-linecap="round" opacity=".45">
      <path d="M15 31l18 5"/><path d="M33 31l-18 5"/></g>
    <ellipse cx="24" cy="27" rx="13" ry="2.6" fill="${C.white}" opacity=".7"/>
    <rect x="9" y="20" width="30" height="7" rx="3.5" fill="${C.white}"/>
    <path d="M19 20v-4a5 5 0 0 1 10 0v4" fill="none" stroke="${C.maroon}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="9" r="3.2" fill="${C.maroon}"/>` },
    { id: "noodles", label: "noodle party", cat: "fud", tags: "ramen friday sister maggi bowl", svg: `
    <path d="M7 24h34a17 17 0 0 1-34 0z" fill="${C.clay}"/>
    <path d="M10 24h28a14 14 0 0 1-28 0z" fill="${C.sand}"/>
    <g fill="none" stroke="${C.butter}" stroke-width="2" stroke-linecap="round">
      <path d="M14 22c0-5 3-8 6-8"/><path d="M20 21c0-6 4-9 8-8"/><path d="M27 22c1-5 4-7 7-6"/></g>
    <path d="M34 8 20 20" stroke="${C.brown}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <path d="M39 11 25 22" stroke="${C.brown}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` },
    { id: "samosa", label: "samosa", cat: "fud", tags: "pakora desi snack fried pk", svg: `
    <path d="M24 8 42 38a2 2 0 0 1-1.8 3H7.8A2 2 0 0 1 6 38z" fill="${C.sand}"/>
    <path d="M24 14 36 36H12z" fill="${C.clay}" opacity=".45"/>
    <path d="M24 8v33" stroke="${C.brown}" stroke-width="1.6" opacity=".4" fill="none"/>
    <g fill="${C.brown}" opacity=".3"><circle cx="18" cy="31" r="1.6"/><circle cx="29" cy="29" r="1.4"/></g>` },
    { id: "crisps", label: "over-hated lays", cat: "fud", tags: "chips crisps salted packet snack", svg: `
    <path d="M13 8h22l2 30a4 4 0 0 1-4 4.4H15A4 4 0 0 1 11 38z" fill="${C.butter}"/>
    <path d="M11 8h26l-1 5H12z" fill="${C.star}"/>
    <path d="M12 38h24l.4 4.4H11.6z" fill="${C.star}"/>
    <ellipse cx="24" cy="24" rx="8" ry="6" fill="${C.clay}" opacity=".5"/>
    <path d="M17 24q3.5-4 7 0t7 0" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round"/>` },
    { id: "watermelon", label: "watermelon", cat: "fud", tags: "fruit summer slice pink", svg: `
    <path d="M5 14h38a19 19 0 0 1-38 0z" fill="${C.rose}"/>
    <path d="M5 14h38a19 19 0 0 0-38 0z" fill="${C.green}" transform="translate(0,-3)"/>
    <path d="M5 11h38v3.4H5z" fill="${C.mint}"/>
    <g fill="${C.deep}"><circle cx="17" cy="21" r="1.6"/><circle cx="24" cy="25" r="1.6"/><circle cx="31" cy="21" r="1.6"/><circle cx="24" cy="18" r="1.4"/></g>` },
    { id: "strawberry", label: "strawberry", cat: "fud", tags: "fruit red berry sweet", svg: `
    <path d="M24 14c9 0 14 6 14 13S31 43 24 43 10 34 10 27s5-13 14-13z" fill="${C.maroon}"/>
    <path d="M24 15c-4 0-7-3-7-6 3 0 5 1 6 2 1-2 3-3 5-3s3 2 3 4c2-1 4-1 6-1 0 3-4 4-13 4z" fill="${C.forest}"/>
    <g fill="${C.butter}"><circle cx="19" cy="24" r="1.4"/><circle cx="28" cy="23" r="1.4"/><circle cx="24" cy="30" r="1.4"/><circle cx="31" cy="31" r="1.3"/><circle cx="17" cy="32" r="1.3"/></g>` },
    { id: "cherry", label: "cherries", cat: "fud", tags: "fruit red pair two", svg: `
    <path d="M24 8c-6 6-10 12-12 20M24 8c4 7 7 13 8 20" fill="none" stroke="${C.forest}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M24 8c4-3 8-3 11-1-3 3-7 4-11 1z" fill="${C.green}"/>
    <circle cx="14" cy="33" r="8" fill="${C.maroon}"/>
    <circle cx="33" cy="33" r="7" fill="${C.maroon}"/>
    <circle cx="11.6" cy="30.6" r="2" fill="${C.rose}" opacity=".7"/>` },
    { id: "avocado", label: "avocado", cat: "fud", tags: "green healthy toast half", svg: `
    <path d="M24 6c9 0 15 9 15 20s-6 17-15 17S9 37 9 26 15 6 24 6z" fill="${C.forest}"/>
    <path d="M24 11c6 0 11 7 11 15s-5 13-11 13-11-5-11-13S18 11 24 11z" fill="${C.mint}"/>
    <ellipse cx="24" cy="28" rx="6.4" ry="7" fill="${C.brown}"/>` },
    { id: "egg", label: "egg", cat: "fud", tags: "omelette ameero breakfast fried", svg: `
    <path d="M12 30c-2-8 4-14 10-13s10 5 12 10 6 6 4 10-8 5-14 4-10-4-12-11z" fill="${C.white}"/>
    <circle cx="24" cy="27" r="7.4" fill="${C.star}"/>
    <circle cx="21.6" cy="24.6" r="2.4" fill="${C.butter}" opacity=".7"/>` },
    { id: "bread", label: "bread", cat: "fud", tags: "toast loaf breakfast", svg: `
    <path d="M10 20c0-7 6-11 14-11s14 4 14 11v18a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="${C.sand}"/>
    <path d="M13 22c0-5 5-8 11-8s11 3 11 8z" fill="${C.clay}" opacity=".5"/>
    <g fill="${C.clay}" opacity=".35"><circle cx="19" cy="30" r="2"/><circle cx="28" cy="33" r="1.8"/></g>` },
    { id: "honey", label: "honey", cat: "fud", tags: "jar sweet golden bee", svg: `
    <path d="M14 18h20v20a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5z" fill="${C.star}"/>
    <rect x="12" y="14" width="24" height="6" rx="2.4" fill="${C.clay}"/>
    <rect x="16" y="24" width="16" height="7" rx="2" fill="${C.cream}" opacity=".9"/>
    <path d="M24 8v6" stroke="${C.brown}" stroke-width="2.4" stroke-linecap="round" fill="none"/>` },
    /* ═══════════════ outside ═══════════════ */
    { id: "bicycle", label: "cycling", cat: "outside", tags: "bike misses it childhood ride", svg: `
    <g fill="none" stroke="${C.night}" stroke-width="2.6" stroke-linecap="round">
      <circle cx="12" cy="32" r="9"/><circle cx="36" cy="32" r="9"/>
      <path d="M12 32l7-14h9l-9 14h17"/><path d="M28 18l4 14"/><path d="M17 18h5"/><path d="M33 16l3 16"/></g>
    <circle cx="12" cy="32" r="2" fill="${C.star}"/><circle cx="36" cy="32" r="2" fill="${C.star}"/>` },
    { id: "shuttle", label: "badminton", cat: "outside", tags: "shuttlecock sport uni racket", svg: `
    <path d="M9 7q15 4.5 30 0l-6 22H15z" fill="${C.white}"/>
    <g stroke="${C.ice}" stroke-width="1.3" opacity=".95"><path d="M16.6 8.6 19 29M24 9.6V29M31.4 8.6 29 29"/></g>
    <path d="M15 29h18l-1.4 4.6a7.6 7.6 0 0 1-15.2 0z" fill="${C.clay}"/>
    <ellipse cx="24" cy="38.4" rx="7.6" ry="5" fill="${C.terra}"/>` },
    { id: "cricket", label: "cricket", cat: "outside", tags: "bat ball captain school sport", svg: `
    <g transform="rotate(-38 24 22)">
      <rect x="19.5" y="4" width="4.2" height="11" rx="2.1" fill="${C.brown}"/>
      <rect x="16" y="14" width="11.2" height="23" rx="4.4" fill="${C.cream}"/>
      <path d="M18.6 17v17" stroke="${C.clay}" stroke-width="1.1" stroke-linecap="round" opacity=".55" fill="none"/></g>
    <circle cx="12.5" cy="37.5" r="7" fill="${C.maroon}"/>
    <path d="M7.9 33a7 7 0 0 1 9.2 9.2" fill="none" stroke="${C.cream}" stroke-width="1.4" stroke-linecap="round"/>` },
    { id: "basketball", label: "basketball", cat: "outside", tags: "ball sport uni hoop", svg: `
    <circle cx="24" cy="24" r="17" fill="${C.terra}"/>
    <g fill="none" stroke="${C.deep}" stroke-width="1.8">
      <path d="M24 7v34M7 24h34"/><path d="M12 12a20 20 0 0 1 0 24"/><path d="M36 12a20 20 0 0 0 0 24"/></g>` },
    { id: "padel", label: "padel", cat: "outside", tags: "racket tennis want to try sport", svg: `
    <ellipse cx="24" cy="18" rx="13" ry="14" fill="${C.mint}"/>
    <ellipse cx="24" cy="18" rx="9.4" ry="10.4" fill="${C.forest}" opacity=".25"/>
    <g fill="${C.forest}" opacity=".5"><circle cx="20" cy="14" r="1.3"/><circle cx="28" cy="14" r="1.3"/><circle cx="24" cy="19" r="1.3"/><circle cx="20" cy="24" r="1.3"/><circle cx="28" cy="24" r="1.3"/></g>
    <rect x="21.6" y="31" width="4.8" height="13" rx="2.4" fill="${C.brown}"/>` },
    { id: "kite", label: "kite", cat: "outside", tags: "basant sky string wind fly", svg: `
    <path d="M24 5 39 22 24 39 9 22z" fill="${C.coral}"/>
    <path d="M24 5v34M9 22h30" stroke="${C.cream}" stroke-width="1.6" fill="none" opacity=".7"/>
    <path d="M24 39q4 4 0 8t4 0" fill="none" stroke="${C.star}" stroke-width="2" stroke-linecap="round"/>` },
    { id: "tent", label: "camping", cat: "outside", tags: "tent outdoors mountains trip", svg: `
    <path d="M24 8 43 40H5z" fill="${C.teal}"/>
    <path d="M24 8 34 40H14z" fill="${C.forest}" opacity=".45"/>
    <path d="M24 18l7 22h-14z" fill="${C.deep}"/>
    <path d="M5 40h38" stroke="${C.sand}" stroke-width="3.4" stroke-linecap="round" fill="none"/>` },
    { id: "campfire", label: "campfire", cat: "outside", tags: "fire warm night outdoors", svg: `
    <path d="M24 8c6 7 9 12 9 17a9 9 0 0 1-18 0c0-5 3-10 9-17z" fill="${C.coral}"/>
    <path d="M24 18c3 4 4.6 7 4.6 9.6a4.6 4.6 0 0 1-9.2 0c0-2.6 1.6-5.6 4.6-9.6z" fill="${C.star}"/>
    <g stroke="${C.brown}" stroke-width="3.4" stroke-linecap="round"><path d="M12 38l24-4M36 38 12 34"/></g>` },
    { id: "backpack", label: "backpack", cat: "outside", tags: "bag uni travel hike", svg: `
    <path d="M12 18a12 12 0 0 1 24 0v20a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="${C.teal}"/>
    <path d="M17 16a7 7 0 0 1 14 0v5H17z" fill="${C.cream}" opacity=".45"/>
    <rect x="17" y="26" width="14" height="10" rx="3" fill="${C.cream}"/>
    <path d="M24 26v10" stroke="${C.teal}" stroke-width="2" fill="none"/>` },
    { id: "binoculars", label: "lore hunting", cat: "outside", tags: "binoculars look watch spy", svg: `
    <rect x="7" y="16" width="13" height="24" rx="6.5" fill="${C.night}"/>
    <rect x="28" y="16" width="13" height="24" rx="6.5" fill="${C.night}"/>
    <rect x="18" y="22" width="12" height="7" rx="3" fill="${C.deep}"/>
    <circle cx="13.5" cy="34" r="4" fill="${C.ice}"/><circle cx="34.5" cy="34" r="4" fill="${C.ice}"/>
    <rect x="7" y="13" width="13" height="5" rx="2.4" fill="${C.clay}"/>
    <rect x="28" y="13" width="13" height="5" rx="2.4" fill="${C.clay}"/>` },
    { id: "car", label: "road trip", cat: "outside", tags: "car drive mountains murree trip", svg: `
    <path d="M7 30l3-8a5 5 0 0 1 5-3.4h18A5 5 0 0 1 38 22l3 8v6a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-1H14v1a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill="${C.maroon}"/>
    <path d="M13 21h22l2 7H11z" fill="${C.ice}"/>
    <circle cx="14" cy="31" r="2.4" fill="${C.star}"/><circle cx="34" cy="31" r="2.4" fill="${C.star}"/>` },
    { id: "plane", label: "aeroplane", cat: "outside", tags: "flight travel lahore 16k ticket", svg: `
    <path d="M44 22a3 3 0 0 1-2.6 3l-11.4 1.6-6 12.8a1.6 1.6 0 0 1-1.5.9h-2.7a1.4 1.4 0 0 1-1.3-1.9l3.4-10.6-8.4 1.2-3 4.4a1.4 1.4 0 0 1-1.2.6H7a1.2 1.2 0 0 1-1.1-1.7L8.4 25 5.9 17.8A1.2 1.2 0 0 1 7 16h2.3a1.4 1.4 0 0 1 1.2.6l3 4.4 8.4 1.2-3.4-10.6A1.4 1.4 0 0 1 19.8 10h2.7a1.6 1.6 0 0 1 1.5.9l6 12.8 11.4 1.6" fill="${C.ice}"/>` },
    { id: "suitcase", label: "packed", cat: "outside", tags: "suitcase travel luggage trip", svg: `
    <rect x="7" y="17" width="34" height="23" rx="4" fill="${C.clay}"/>
    <path d="M18 17v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" fill="none" stroke="${C.brown}" stroke-width="2.6"/>
    <rect x="7" y="24" width="34" height="4.4" fill="${C.sand}"/>
    <rect x="21" y="22" width="6" height="9" rx="1.6" fill="${C.brown}"/>` },
    { id: "map", label: "map", cat: "outside", tags: "directions lost pin signboard", svg: `
    <path d="M5 12l11-4 16 5 11-4v27l-11 4-16-5-11 4z" fill="${C.cream}"/>
    <path d="M16 8v27M32 13v27" stroke="${C.sand}" stroke-width="1.8" fill="none"/>
    <path d="M24 16c3.4 0 6 2.6 6 6 0 4.4-6 10-6 10s-6-5.6-6-10c0-3.4 2.6-6 6-6z" fill="${C.maroon}"/>
    <circle cx="24" cy="22" r="2.2" fill="${C.cream}"/>` },
    { id: "camera", label: "camera", cat: "outside", tags: "photo polaroid picture memories", svg: `
    <rect x="5" y="15" width="38" height="25" rx="5" fill="${C.night}"/>
    <path d="M17 15l2.6-4h8.8L31 15z" fill="${C.night}"/>
    <circle cx="24" cy="28" r="9" fill="${C.ice}"/>
    <circle cx="24" cy="28" r="5" fill="${C.deep}"/>
    <circle cx="21.6" cy="25.6" r="1.8" fill="${C.white}" opacity=".8"/>
    <circle cx="37" cy="21" r="2" fill="${C.star}"/>` },
    /* ═══════════════ paper ═══════════════ */
    { id: "envelope", label: "a letter", cat: "paper", tags: "mail post write send", svg: `
    <rect x="5" y="12" width="38" height="26" rx="3.4" fill="${C.cream}"/>
    <path d="M5 15.4 24 28l19-12.6" fill="none" stroke="${C.clay}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="24" cy="29" r="4.6" fill="${C.maroon}"/>` },
    { id: "seal", label: "wax seal", cat: "paper", tags: "stamp sealed letter red", svg: `
    <path d="M24 6c2 0 3 2 5 2.6s4-.4 5.6 1 .4 4 1 5.6S39 18 39 20s-2 3-2.6 5 .4 4-1 5.6-4 .4-5.6 1S26 36 24 36s-3-2-5-2.6-4 .4-5.6-1-.4-4-1-5.6S9 24 9 22s2-3 2.6-5-.4-4 1-5.6 4-.4 5.6-1S22 6 24 6z" fill="${C.maroon}"/>
    <circle cx="24" cy="21" r="8" fill="none" stroke="${C.rose}" stroke-width="1.6" opacity=".7"/>
    <path d="M24 15.4c.8 4 3.6 6.8 7.6 7.6-4 .8-6.8 3.6-7.6 7.6-.8-4-3.6-6.8-7.6-7.6 4-.8 6.8-3.6 7.6-7.6z" fill="${C.rose}" opacity=".9"/>` },
    { id: "tape", label: "washi tape", cat: "paper", tags: "sticky scrapbook craft", svg: `
    <path d="M4 18h40v12H4z" fill="${C.ice}" opacity=".8"/>
    <path d="M4 18l3 3-3 3 3 3-3 3v-12zM44 18l-3 3 3 3-3 3 3 3v-12z" fill="${C.cream}"/>
    <g stroke="${C.white}" stroke-width="2" opacity=".65"><path d="M11 18v12M19 18v12M27 18v12M35 18v12"/></g>` },
    { id: "book", label: "the bookmark", cat: "paper", tags: "reading starry night print novel", svg: `
    <path d="M6 10h16a3 3 0 0 1 2 1.2A3 3 0 0 1 26 10h16v28H26a3 3 0 0 0-2 .8 3 3 0 0 0-2-.8H6z" fill="${C.cream}"/>
    <path d="M24 11.2V39" fill="none" stroke="${C.clay}" stroke-width="1.6"/>
    <g stroke="${C.clay}" stroke-width="1.2" opacity=".45"><path d="M10 17h10M10 21h10M10 25h8M28 17h10M28 21h10M28 25h8"/></g>
    <path d="M32 6h6v14l-3-3-3 3z" fill="${C.maroon}"/>` },
    { id: "notebook", label: "journal", cat: "paper", tags: "diary notebook writing journaling", svg: `
    <rect x="9" y="6" width="30" height="36" rx="3" fill="${C.maroon}"/>
    <rect x="14" y="6" width="25" height="36" rx="3" fill="${C.cream}"/>
    <g stroke="${C.clay}" stroke-width="1.4" opacity=".45"><path d="M19 15h15M19 21h15M19 27h12"/></g>
    <g fill="${C.star}"><circle cx="11.5" cy="13" r="1.8"/><circle cx="11.5" cy="24" r="1.8"/><circle cx="11.5" cy="35" r="1.8"/></g>` },
    { id: "pen", label: "pen", cat: "paper", tags: "write ink nib fountain", svg: `
    <path d="M34 6l8 8-22 22-10 2 2-10z" fill="${C.ice}"/>
    <path d="M34 6l8 8-4 4-8-8z" fill="${C.night}"/>
    <path d="M12 28l8 8-10 2z" fill="${C.deep}"/>
    <path d="M14 34l1.4 1.4" stroke="${C.cream}" stroke-width="1.6" fill="none"/>` },
    { id: "pencil", label: "pencil", cat: "paper", tags: "draw sketch write school", svg: `
    <path d="M32 4 44 16 20 40 8 42l2-12z" fill="${C.star}"/>
    <path d="M32 4l12 12-4 4-12-12z" fill="${C.rose}"/>
    <path d="M10 30l8 8-10 4z" fill="${C.sand}"/>
    <path d="M8 40l2-4 2 2z" fill="${C.deep}"/>` },
    { id: "paperclip", label: "paperclip", cat: "paper", tags: "clip attach office", svg: `
    <path d="M32 14v18a9 9 0 0 1-18 0V13a6 6 0 0 1 12 0v18a3 3 0 0 1-6 0V15" fill="none" stroke="${C.grey}" stroke-width="3.4" stroke-linecap="round"/>` },
    { id: "stamp", label: "stamp", cat: "paper", tags: "post mail postage", svg: `
    <path d="M8 10h32v28H8z" fill="${C.cream}"/>
    <g fill="${C.night}" opacity=".12">
      <circle cx="8" cy="16" r="2.6"/><circle cx="8" cy="24" r="2.6"/><circle cx="8" cy="32" r="2.6"/>
      <circle cx="40" cy="16" r="2.6"/><circle cx="40" cy="24" r="2.6"/><circle cx="40" cy="32" r="2.6"/>
      <circle cx="16" cy="10" r="2.6"/><circle cx="24" cy="10" r="2.6"/><circle cx="32" cy="10" r="2.6"/>
      <circle cx="16" cy="38" r="2.6"/><circle cx="24" cy="38" r="2.6"/><circle cx="32" cy="38" r="2.6"/></g>
    <rect x="13" y="15" width="22" height="18" rx="2" fill="${C.night}"/>
    <circle cx="24" cy="21" r="4" fill="${C.star}"/>
    <path d="M13 33l7-7 5 4 5-5 5 8z" fill="${C.teal}"/>` },
    { id: "postcard", label: "postcard", cat: "paper", tags: "card mail travel note", svg: `
    <rect x="5" y="12" width="38" height="26" rx="3" fill="${C.cream}"/>
    <rect x="9" y="16" width="15" height="18" rx="2" fill="${C.sky}"/>
    <circle cx="14" cy="21" r="2.4" fill="${C.star}"/>
    <path d="M9 30l5-5 4 3 4-4 2 3v7H9z" fill="${C.forest}"/>
    <g stroke="${C.clay}" stroke-width="1.4" opacity=".5"><path d="M28 20h11M28 24h11M28 28h7"/></g>
    <rect x="33" y="15" width="7" height="5" rx="1" fill="${C.maroon}" opacity=".6"/>` },
    { id: "scissors", label: "scissors", cat: "paper", tags: "cut craft collage", svg: `
    <g fill="none" stroke="${C.grey}" stroke-width="3" stroke-linecap="round">
      <path d="M12 8l20 24"/><path d="M36 8 16 32"/></g>
    <circle cx="14" cy="37" r="5.4" fill="none" stroke="${C.maroon}" stroke-width="3"/>
    <circle cx="34" cy="37" r="5.4" fill="none" stroke="${C.maroon}" stroke-width="3"/>` },
    { id: "ribbon", label: "ribbon", cat: "paper", tags: "bow gift wrap pretty", svg: `
    <path d="M24 20c-6-8-16-10-18-4s6 10 18 4z" fill="${C.rose}"/>
    <path d="M24 20c6-8 16-10 18-4s-6 10-18 4z" fill="${C.rose}"/>
    <circle cx="24" cy="20" r="4.4" fill="${C.maroon}"/>
    <path d="M21 24 16 42l8-6 8 6-5-18z" fill="${C.pink}"/>` },
    { id: "key", label: "key", cat: "paper", tags: "lock secret unlock passphrase", svg: `
    <circle cx="15" cy="17" r="9.4" fill="none" stroke="${C.star}" stroke-width="4"/>
    <path d="M21 23 38 40" stroke="${C.star}" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M31 33l5-5M35 37l4-4" stroke="${C.star}" stroke-width="3.4" stroke-linecap="round" fill="none"/>` },
    { id: "clock", label: "1 pm", cat: "paper", tags: "time clock ritual check in lock in", svg: `
    <circle cx="24" cy="24" r="18" fill="${C.cream}"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="${C.night}" stroke-width="3"/>
    <path d="M24 13v11l7 5" fill="none" stroke="${C.night}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="2" fill="${C.maroon}"/>` },
    { id: "polaroid", label: "polaroid", cat: "paper", tags: "photo picture memory wall", svg: `
    <rect x="7" y="7" width="34" height="34" rx="2" fill="${C.white}" transform="rotate(-5 24 24)"/>
    <g transform="rotate(-5 24 24)">
      <rect x="11" y="11" width="26" height="20" fill="${C.night}"/>
      <circle cx="18" cy="17" r="2.6" fill="${C.star}"/>
      <path d="M11 31l7-7 5 4 6-6 8 9z" fill="${C.forest}"/>
      <path d="M16 36h16" stroke="${C.clay}" stroke-width="1.6" stroke-linecap="round" opacity=".5" fill="none"/></g>` },
    { id: "gift", label: "gift", cat: "paper", tags: "present birthday jahez box", svg: `
    <rect x="7" y="20" width="34" height="22" rx="3" fill="${C.maroon}"/>
    <rect x="5" y="14" width="38" height="8" rx="2.6" fill="${C.rose}"/>
    <rect x="20.4" y="14" width="7.2" height="28" fill="${C.star}"/>
    <path d="M24 14c-4-6-10-6-10-2s5 3 10 2zM24 14c4-6 10-6 10-2s-5 3-10 2z" fill="${C.star}"/>` },
    { id: "heart", label: "heart", cat: "paper", tags: "love dil red", svg: `
    <path d="M24 42S6 30 6 18.4A9.4 9.4 0 0 1 24 14a9.4 9.4 0 0 1 18 4.4C42 30 24 42 24 42z" fill="${C.maroon}"/>
    <path d="M14 18a5 5 0 0 1 5-4" fill="none" stroke="${C.rose}" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>` },
    { id: "hearts", label: "two hearts", cat: "paper", tags: "love pair us team double", svg: `
    <path d="M17 36S4 27 4 18.8A7 7 0 0 1 17 15.4a7 7 0 0 1 13 3.4C30 27 17 36 17 36z" fill="${C.rose}"/>
    <path d="M32 42S21 34 21 27a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 7-11 15-11 15z" fill="${C.maroon}"/>` },
    { id: "sparkle", label: "sparkles", cat: "paper", tags: "shine magic whimsy pixey dust", svg: `
    <path d="M17 6c1.2 6.4 4.6 9.8 11 11-6.4 1.2-9.8 4.6-11 11-1.2-6.4-4.6-9.8-11-11 6.4-1.2 9.8-4.6 11-11z" fill="${C.star}"/>
    <path d="M35 22c.8 4.2 3 6.4 7.2 7.2-4.2.8-6.4 3-7.2 7.2-.8-4.2-3-6.4-7.2-7.2 4.2-.8 6.4-3 7.2-7.2z" fill="${C.butter}"/>
    <circle cx="37" cy="11" r="2.6" fill="${C.star}" opacity=".85"/>` },
    { id: "moth", label: "a moth", cat: "paper", tags: "insect night lamp wings", svg: `
    <path d="M23 22C17 12 8 10 6 16c-2 5.4 4 12 17 10z" fill="${C.cream}"/>
    <path d="M25 22c6-10 15-12 17-6 2 5.4-4 12-17 10z" fill="${C.cream}"/>
    <path d="M23 24c-5 6-11 10-14 7-2.6-2.8 2-9 14-9z" fill="${C.ice}" opacity=".85"/>
    <path d="M25 24c5 6 11 10 14 7 2.6-2.8-2-9-14-9z" fill="${C.ice}" opacity=".85"/>
    <ellipse cx="24" cy="26" rx="2.6" ry="10" fill="${C.brown}"/>
    <path d="M22 16c-1.4-3-3-4.4-5-5M26 16c1.4-3 3-4.4 5-5" fill="none" stroke="${C.brown}" stroke-width="1.6" stroke-linecap="round"/>` },
    { id: "turtle", label: "mister byte", cat: "paper", tags: "turtle his stuffed toy slow", svg: `
    <ellipse cx="24" cy="27" rx="15" ry="11" fill="${C.forest}"/>
    <ellipse cx="24" cy="26" rx="10.4" ry="7.4" fill="${C.olive}"/>
    <g fill="${C.forest}" opacity=".55">
      <circle cx="24" cy="26" r="3"/><circle cx="17" cy="24" r="2.2"/><circle cx="31" cy="24" r="2.2"/>
      <circle cx="20" cy="30" r="2"/><circle cx="28" cy="30" r="2"/></g>
    <circle cx="40" cy="22" r="4.6" fill="${C.olive}"/>
    <circle cx="41.4" cy="21" r="1.2" fill="${C.deep}"/>
    <g fill="${C.olive}"><ellipse cx="13" cy="36" rx="4" ry="2.6"/><ellipse cx="32" cy="36" rx="4" ry="2.6"/></g>` },
    { id: "ring", label: "da scam", cat: "paper", tags: "ring marriage nikkah papers permanent subscription", svg: `
    <circle cx="24" cy="30" r="12" fill="none" stroke="${C.star}" stroke-width="4"/>
    <path d="M24 6 31 15l-7 5-7-5z" fill="${C.ice}"/>
    <path d="M24 6 31 15H17z" fill="${C.white}" opacity=".7"/>` },
    /* ═══════════════ home things ═══════════════ */
    { id: "lamp", label: "lamp", cat: "home", tags: "light room reading night", svg: `
    <path d="M12 22 24 8l12 14z" fill="${C.star}"/>
    <path d="M12 22h24l-2 3H14z" fill="${C.starDeep}"/>
    <path d="M24 25v13" stroke="${C.brown}" stroke-width="2.6" fill="none"/>
    <path d="M14 42h20l-2-4H16z" fill="${C.brown}"/>` },
    { id: "lantern", label: "lantern", cat: "home", tags: "light ramadan warm glow", svg: `
    <path d="M24 5v5" stroke="${C.brown}" stroke-width="2.2" fill="none"/>
    <rect x="15" y="10" width="18" height="4" rx="2" fill="${C.brown}"/>
    <path d="M17 14h14l2 20a4 4 0 0 1-4 4.4H19a4 4 0 0 1-4-4.4z" fill="${C.star}" opacity=".85"/>
    <rect x="14" y="38" width="20" height="4" rx="2" fill="${C.brown}"/>
    <path d="M24 19v14" stroke="${C.starDeep}" stroke-width="1.6" fill="none" opacity=".6"/>` },
    { id: "candle", label: "candle", cat: "home", tags: "light flame warm quiet", svg: `
    <path d="M24 6c3 4 4.4 6.4 4.4 8.6a4.4 4.4 0 0 1-8.8 0c0-2.2 1.4-4.6 4.4-8.6z" fill="${C.star}"/>
    <rect x="17" y="19" width="14" height="22" rx="3" fill="${C.cream}"/>
    <path d="M24 16v3" stroke="${C.brown}" stroke-width="1.8" fill="none"/>
    <ellipse cx="24" cy="19.4" rx="7" ry="2" fill="${C.sand}"/>` },
    { id: "lights", label: "string lights", cat: "home", tags: "fairy lights room decor cosy", svg: `
    <path d="M3 10q11 12 21 0t21 0" fill="none" stroke="${C.brown}" stroke-width="2"/>
    <g>
      <path d="M11 15a3.4 3.4 0 1 1 6.8 0 3.4 3.4 0 0 1-6.8 0z" fill="${C.star}"/>
      <path d="M21 18a3.4 3.4 0 1 1 6.8 0 3.4 3.4 0 0 1-6.8 0z" fill="${C.rose}"/>
      <path d="M31 15a3.4 3.4 0 1 1 6.8 0 3.4 3.4 0 0 1-6.8 0z" fill="${C.ice}"/>
      <path d="M6 20a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" fill="${C.mint}"/>
      <path d="M37 21a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" fill="${C.star}"/></g>` },
    { id: "bed", label: "nini time", cat: "home", tags: "sleep bed rest tired sleepsy", svg: `
    <path d="M5 20h14a4 4 0 0 1 4 4v4H5z" fill="${C.ice}"/>
    <rect x="5" y="28" width="38" height="8" rx="2.6" fill="${C.clay}"/>
    <rect x="3" y="20" width="4" height="20" rx="2" fill="${C.brown}"/>
    <rect x="41" y="26" width="4" height="14" rx="2" fill="${C.brown}"/>
    <path d="M23 24h20v4H23z" fill="${C.rose}"/>` },
    { id: "window", label: "the window", cat: "home", tags: "vangogh asylum view outside bars", svg: `
    <rect x="8" y="6" width="32" height="36" rx="3" fill="${C.night}"/>
    <rect x="11" y="9" width="26" height="30" rx="2" fill="${C.deep}"/>
    <circle cx="19" cy="17" r="2.4" fill="${C.star}"/>
    <circle cx="31" cy="22" r="1.6" fill="${C.star}"/>
    <path d="M11 33l7-6 5 4 6-7 8 9v6H11z" fill="${C.forest}"/>
    <path d="M24 9v30M11 24h26" stroke="${C.night}" stroke-width="3" fill="none"/>` },
    { id: "laptop", label: "lock in", cat: "home", tags: "laptop work computer study focus", svg: `
    <path d="M11 11h26v20H11z" fill="${C.night}"/>
    <rect x="13" y="13" width="22" height="16" rx="1.4" fill="${C.ice}"/>
    <path d="M5 33h38l-2 5a3 3 0 0 1-2.8 2H9.8A3 3 0 0 1 7 38z" fill="${C.grey}"/>
    <path d="M20 35h8" stroke="${C.deep}" stroke-width="1.6" stroke-linecap="round" fill="none"/>` },
    { id: "phone", label: "phone", cat: "home", tags: "mobile cracked screen drops it", svg: `
    <rect x="13" y="4" width="22" height="40" rx="4" fill="${C.night}"/>
    <rect x="15.4" y="8" width="17.2" height="30" rx="1.6" fill="${C.ice}"/>
    <circle cx="24" cy="41" r="1.6" fill="${C.grey}"/>
    <path d="M20 8l6 14-4 2 5 14" stroke="${C.white}" stroke-width="1.3" fill="none" opacity=".8"/>` },
    { id: "headphones", label: "headphones", cat: "home", tags: "music listen audio song", svg: `
    <path d="M9 30V24a15 15 0 0 1 30 0v6" fill="none" stroke="${C.night}" stroke-width="3.4" stroke-linecap="round"/>
    <rect x="5" y="27" width="9" height="14" rx="4.5" fill="${C.maroon}"/>
    <rect x="34" y="27" width="9" height="14" rx="4.5" fill="${C.maroon}"/>` },
    { id: "music", label: "a song", cat: "home", tags: "music note ost melody", svg: `
    <path d="M20 36V11l18-4v25" fill="none" stroke="${C.night}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M20 17l18-4" stroke="${C.night}" stroke-width="2.6" fill="none"/>
    <ellipse cx="15" cy="36" rx="6" ry="4.6" fill="${C.maroon}" transform="rotate(-18 15 36)"/>
    <ellipse cx="33" cy="32" rx="6" ry="4.6" fill="${C.maroon}" transform="rotate(-18 33 32)"/>` },
    { id: "film", label: "movie night", cat: "home", tags: "film cinema watch together reel", svg: `
    <rect x="5" y="12" width="38" height="24" rx="3" fill="${C.night}"/>
    <g fill="${C.cream}">
      <rect x="8" y="15" width="4" height="4" rx="1"/><rect x="8" y="22" width="4" height="4" rx="1"/><rect x="8" y="29" width="4" height="4" rx="1"/>
      <rect x="36" y="15" width="4" height="4" rx="1"/><rect x="36" y="22" width="4" height="4" rx="1"/><rect x="36" y="29" width="4" height="4" rx="1"/></g>
    <rect x="15" y="16" width="18" height="16" rx="1.6" fill="${C.ice}"/>` },
    { id: "balloon", label: "balloon", cat: "home", tags: "party celebrate birthday float", svg: `
    <path d="M24 5c7 0 12 6 12 13s-5 14-12 14-12-7-12-14S17 5 24 5z" fill="${C.coral}"/>
    <path d="M18 12a7 7 0 0 1 5-5" fill="none" stroke="${C.white}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
    <path d="M22 32h4l-2 3z" fill="${C.coral}"/>
    <path d="M24 35q4 4 0 7t0 4" fill="none" stroke="${C.brown}" stroke-width="1.6" stroke-linecap="round"/>` },
    { id: "crown", label: "PEAK", cat: "home", tags: "crown king queen best peak", svg: `
    <path d="M6 34 8 14l9 7 7-11 7 11 9-7 2 20z" fill="${C.star}"/>
    <rect x="6" y="34" width="36" height="6" rx="2" fill="${C.starDeep}"/>
    <g fill="${C.maroon}"><circle cx="16" cy="28" r="2"/><circle cx="24" cy="26" r="2.2"/><circle cx="32" cy="28" r="2"/></g>` },
    { id: "glasses", label: "glasses", cat: "home", tags: "specs read harry potter misdiagnosis", svg: `
    <circle cx="13" cy="26" r="8.4" fill="none" stroke="${C.night}" stroke-width="3"/>
    <circle cx="35" cy="26" r="8.4" fill="none" stroke="${C.night}" stroke-width="3"/>
    <path d="M21.4 25h5.2" stroke="${C.night}" stroke-width="3" fill="none"/>
    <path d="M4.6 23 8 19M43.4 23 40 19" stroke="${C.night}" stroke-width="3" stroke-linecap="round" fill="none"/>` },
    { id: "umbrella", label: "umbrella", cat: "home", tags: "rain barish shelter protect bubble", svg: `
    <path d="M4 24a20 20 0 0 1 40 0z" fill="${C.maroon}"/>
    <path d="M4 24q5-6 10 0t10 0t10 0t10 0" fill="none" stroke="${C.rose}" stroke-width="2"/>
    <path d="M24 24v14a4 4 0 0 1-8 0" fill="none" stroke="${C.brown}" stroke-width="2.6" stroke-linecap="round"/>` },
    { id: "tv", label: "screen share", cat: "home", tags: "tv screen watch together recording", svg: `
    <rect x="5" y="9" width="38" height="26" rx="3" fill="${C.night}"/>
    <rect x="8" y="12" width="32" height="20" rx="1.6" fill="${C.ice}"/>
    <path d="M20 17l9 5-9 5z" fill="${C.night}"/>
    <path d="M16 40h16M24 35v5" stroke="${C.grey}" stroke-width="2.6" stroke-linecap="round" fill="none"/>` },
    /* ═══════════════ feelings ═══════════════ */
    { id: "zzz", label: "sleepsy", cat: "feels", tags: "sleep tired zzz nini bed", svg: `
    <path d="M28 6h13l-13 15h13" fill="none" stroke="${C.ice}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 22h11l-11 12h11" fill="none" stroke="${C.ice}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    <path d="M6 34h8l-8 8h8" fill="none" stroke="${C.ice}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>` },
    { id: "bubble", label: "da yap", cat: "feels", tags: "speech talk chat bubble yapping", svg: `
    <path d="M8 8h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H22l-10 8v-8H8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="${C.cream}"/>
    <g fill="${C.clay}" opacity=".55"><circle cx="16" cy="21" r="2.6"/><circle cx="24" cy="21" r="2.6"/><circle cx="32" cy="21" r="2.6"/></g>` },
    { id: "exclaim", label: "EXCUSE ME", cat: "feels", tags: "shout caps loud emphasis", svg: `
    <path d="M20 6h8l-2 24h-4z" fill="${C.maroon}"/>
    <circle cx="24" cy="38" r="4.6" fill="${C.maroon}"/>` },
    { id: "question", label: "da confused", cat: "feels", tags: "question idk confused what", svg: `
    <path d="M16 18a8 8 0 1 1 12 7c-2.4 1.6-3.2 3-3.2 5.6" fill="none" stroke="${C.night}" stroke-width="4.4" stroke-linecap="round"/>
    <circle cx="24.4" cy="39" r="4" fill="${C.night}"/>` },
    { id: "spark", label: "shiny eyes", cat: "feels", tags: "spark idea passion shining excited", svg: `
    <path d="M24 4v10M24 34v10M4 24h10M34 24h10M10 10l7 7M31 31l7 7M38 10l-7 7M17 31l-7 7" stroke="${C.star}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <circle cx="24" cy="24" r="7" fill="${C.star}"/>
    <circle cx="22" cy="22" r="2.4" fill="${C.white}" opacity=".8"/>` },
    { id: "infinity", label: "forever", cat: "feels", tags: "infinity always team permanent", svg: `
    <path d="M24 24c-4-7-8-9-12-7s-5 9-1 12 9 1 13-5c4-6 9-8 13-5s3 10-1 12-8 0-12-7z" fill="none" stroke="${C.maroon}" stroke-width="4" stroke-linecap="round"/>` },
    { id: "team", label: "da team", cat: "feels", tags: "team us together hands two", svg: `
    <circle cx="15" cy="16" r="6.4" fill="${C.star}"/>
    <path d="M4 40c0-7 5-12 11-12s11 5 11 12z" fill="${C.star}"/>
    <circle cx="33" cy="16" r="6.4" fill="${C.ice}"/>
    <path d="M22 40c0-7 5-12 11-12s11 5 11 12z" fill="${C.ice}"/>` },
    { id: "dua", label: "ameeen", cat: "feels", tags: "dua hands pray namaz allah tahajjud", svg: `
    <path d="M17 42V24c0-8 2-14 4-16 2 3 2 9 2 16v2" fill="${C.sand}"/>
    <path d="M31 42V24c0-8-2-14-4-16-2 3-2 9-2 16v2" fill="${C.sand}"/>
    <path d="M14 42c0-8 3-14 5-16M34 42c0-8-3-14-5-16" fill="none" stroke="${C.sand}" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 4c1 3.4 2.6 5 6 6-3.4 1-5 2.6-6 6-1-3.4-2.6-5-6-6 3.4-1 5-2.6 6-6z" fill="${C.star}"/>` }
  ];
  const BY_ID = /* @__PURE__ */ Object.create(null);
  for (const s of SHEET) BY_ID[s.id] = s;
  const CATS = [
    { id: "all", label: "everything" },
    { id: "sky", label: "the sky" },
    { id: "garden", label: "the garden" },
    { id: "fud", label: "fud" },
    { id: "outside", label: "outside" },
    { id: "paper", label: "paper" },
    { id: "home", label: "home" },
    { id: "feels", label: "feelings" },
    { id: "ours", label: "ours" }
    /* filled by uploads, see app.js */
  ];
  const CAT_LABEL = /* @__PURE__ */ Object.create(null);
  for (const c of CATS) CAT_LABEL[c.id] = c.label;
  const tokens = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const s of SHEET) {
    s._name = tokens(s.id + " " + s.label);
    s._tags = tokens((s.tags || "") + " " + (CAT_LABEL[s.cat] || ""));
  }
  function score(word, s) {
    let best = 0;
    for (const t of s._name) {
      if (t === word) return 100;
      if (t.startsWith(word)) best = Math.max(best, 50);
      else if (t.includes(word)) best = Math.max(best, 20);
    }
    for (const t of s._tags) {
      if (t === word) best = Math.max(best, 70);
      else if (t.startsWith(word)) best = Math.max(best, 25);
      else if (t.includes(word)) best = Math.max(best, 6);
    }
    return best;
  }
  function search(q, cat) {
    const words = String(q || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    let list = SHEET;
    if (cat && cat !== "all" && cat !== "ours") list = list.filter((s) => s.cat === cat);
    if (!words.length) return list;
    const hits = [];
    for (const s of list) {
      let total = 0;
      for (const w of words) {
        const sc = score(w, s);
        if (!sc) {
          total = 0;
          break;
        }
        total += sc;
      }
      if (total) hits.push({ s, total });
    }
    return hits.sort((a, b) => b.total - a.total).map((h) => h.s);
  }
  function markup(id, extra) {
    const s = BY_ID[id];
    if (!s) return "";
    return `<svg viewBox="0 0 48 48" class="stk__art"${extra || ""} aria-hidden="true">${s.svg}</svg>`;
  }
  global.Stickers = {
    SHEET,
    CATS,
    search,
    markup,
    byId: (id) => BY_ID[id],
    has: (id) => !!BY_ID[id],
    count: SHEET.length
  };
})(window);
