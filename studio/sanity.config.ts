import { defineConfig, isDev } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';

import { schemaTypes } from './schemas';
import { singletonTypes, structure } from './structure/desk';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? '';
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production';

export default defineConfig({
  name: 'sko',
  title: 'SKO',
  projectId,
  dataset,

  plugins: [structureTool({ structure }), ...(isDev ? [visionTool()] : [])],

  schema: {
    types: schemaTypes,
    // Singletons must not be creatable or deletable from the Studio.
    templates: (templates) => templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },

  document: {
    actions: (input, context) =>
      singletonTypes.has(context.schemaType)
        ? input.filter(
            ({ action }) => action !== 'unpublish' && action !== 'delete' && action !== 'duplicate',
          )
        : input,
  },
});
