'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

function generateOpenApiJson() {
  const candidateYamlPaths = [
    path.resolve(__dirname, '../docs/openapi.yaml'),
    path.resolve(process.cwd(), 'docs/openapi.yaml'),
    path.resolve(__dirname, '../docs/openapi.yml'),
    path.resolve(process.cwd(), 'docs/openapi.yml')
  ];

  let yamlPath = null;
  for (const p of candidateYamlPaths) {
    if (fs.existsSync(p)) {
      yamlPath = p;
      break;
    }
  }

  if (!yamlPath) {
    console.error('[generate-openapi-json] Error: Could not locate openapi.yaml in candidate paths:');
    candidateYamlPaths.forEach(p => console.error('  - ' + p));
    process.exit(1);
  }

  const outputPath = path.resolve(path.dirname(yamlPath), 'openapi.json');

  console.log(`[generate-openapi-json] Reading YAML specification from: ${yamlPath}`);
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');

  let parsedSpec;
  try {
    parsedSpec = yaml.parse(yamlContent);
  } catch (err) {
    console.error(`[generate-openapi-json] YAML parsing failed: ${err.message}`);
    process.exit(1);
  }

  console.log(`[generate-openapi-json] Writing JSON specification to: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(parsedSpec, null, 2), 'utf8');
  console.log('[generate-openapi-json] OpenAPI JSON generation complete!');
}

if (require.main === module) {
  generateOpenApiJson();
}

module.exports = generateOpenApiJson;
