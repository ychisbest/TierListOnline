// @ts-check
import { defineConfig,passthroughImageService } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { DEFAULT_LOCALE_SETTING, LOCALES_SETTING, } from './src/locales'
import tailwindcss from '@tailwindcss/vite';
import {SITE_URL} from "./src/consts"

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({

  image: {
    service: passthroughImageService(),
  },

  site: SITE_URL,

  i18n: {
    defaultLocale: DEFAULT_LOCALE_SETTING,
    locales: Object.keys(LOCALES_SETTING),
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },

  integrations: [mdx(), sitemap({
    i18n: {
      defaultLocale: DEFAULT_LOCALE_SETTING,
      locales: Object.fromEntries(
        Object.entries(LOCALES_SETTING).map(
          ([key, value]) => [key, value.lang ?? key]
        )
      ),
    },
  }), react()],

  vite: {
    plugins: [tailwindcss()],
  },


});