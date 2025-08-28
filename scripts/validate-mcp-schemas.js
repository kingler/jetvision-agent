#!/usr/bin/env node

/**
 * MCP Tool Schema Validator
 * Validates that MCP tool definitions conform to the Model Context Protocol specification
 */

const fs = require('fs');
const path = require('path');

class MCPSchemaValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validateToolSchema(tool, toolName, serverName) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!tool.name) {
      errors.push(`Tool "${toolName}" in ${serverName}: Missing required field 'name'`);
    }

    if (!tool.description) {
      errors.push(`Tool "${toolName}" in ${serverName}: Missing required field 'description'`);
    } else if (tool.description.length < 10) {
      warnings.push(`Tool "${toolName}" in ${serverName}: Description should be more descriptive (at least 10 characters)`);
    }

    if (!tool.inputSchema) {
      errors.push(`Tool "${toolName}" in ${serverName}: Missing required field 'inputSchema'`);
    } else {
      // Validate input schema structure
      if (tool.inputSchema.type !== 'object') {
        errors.push(`Tool "${toolName}" in ${serverName}: inputSchema.type must be 'object'`);
      }

      if (!tool.inputSchema.properties || typeof tool.inputSchema.properties !== 'object') {
        errors.push(`Tool "${toolName}" in ${serverName}: inputSchema must have 'properties' object`);
      } else {
        // Validate properties
        Object.entries(tool.inputSchema.properties).forEach(([propName, propDef]) => {
          if (!propDef.type) {
            errors.push(`Tool "${toolName}" in ${serverName}: Property "${propName}" missing type`);
          }

          if (!propDef.description) {
            warnings.push(`Tool "${toolName}" in ${serverName}: Property "${propName}" should have a description`);
          }

          // Validate enum values if present
          if (propDef.enum && !Array.isArray(propDef.enum)) {
            errors.push(`Tool "${toolName}" in ${serverName}: Property "${propName}" enum must be an array`);
          }

          // Validate array items if type is array
          if (propDef.type === 'array' && !propDef.items) {
            errors.push(`Tool "${toolName}" in ${serverName}: Property "${propName}" of type array must have 'items' definition`);
          }
        });
      }

      if (tool.inputSchema.required && !Array.isArray(tool.inputSchema.required)) {
        errors.push(`Tool "${toolName}" in ${serverName}: inputSchema.required must be an array`);
      }

      // Check that all required properties exist in properties
      if (tool.inputSchema.required) {
        tool.inputSchema.required.forEach(requiredField => {
          if (!tool.inputSchema.properties || !tool.inputSchema.properties[requiredField]) {
            errors.push(`Tool "${toolName}" in ${serverName}: Required field "${requiredField}" not found in properties`);
          }
        });
      }
    }

    // Check for naming conventions
    if (tool.name && !tool.name.match(/^[a-z][a-z0-9-]*$/)) {
      warnings.push(`Tool "${toolName}" in ${serverName}: Name should use kebab-case (lowercase with hyphens)`);
    }

    return { errors, warnings };
  }

  async validateServerTools(serverPath, serverName) {
    console.log(`\nValidating ${serverName} tools...`);

    try {
      // Find tool definition files
      const srcPath = path.join(serverPath, 'src');
      const files = fs.readdirSync(srcPath).filter(file => 
        file.includes('tools') && (file.endsWith('.js') || file.endsWith('.ts'))
      );

      if (files.length === 0) {
        this.warnings.push(`No tool files found in ${serverName}/src/`);
        return;
      }

      for (const file of files) {
        const filePath = path.join(srcPath, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Extract tool definitions from server.ts setupTools method
        if (file.includes('server') && content.includes('setupTools')) {
          this.extractAndValidateToolsFromServer(content, serverName);
        }

        // Extract tool definitions from tools files
        if (file.includes('tools') && !file.includes('server')) {
          this.extractAndValidateToolsFromToolsFile(content, serverName, file);
        }
      }
    } catch (error) {
      this.errors.push(`Error validating ${serverName}: ${error.message}`);
    }
  }

  extractAndValidateToolsFromServer(content, serverName) {
    // Extract tools array from setupTools method
    const toolsMatch = content.match(/tools\s*=\s*\[([\s\S]*?)\]/);
    if (!toolsMatch) {
      this.warnings.push(`${serverName}: Could not find tools array in server file`);
      return;
    }

    try {
      // This is a simplified extraction - in practice, you'd want more robust parsing
      const toolsString = toolsMatch[1];
      
      // Look for tool objects
      const toolMatches = toolsString.match(/\{\s*name:\s*["'`]([^"'`]+)["'`][\s\S]*?\}/g);
      
      if (toolMatches) {
        toolMatches.forEach((toolString, index) => {
          try {
            // Extract tool properties using regex (simplified approach)
            const nameMatch = toolString.match(/name:\s*["'`]([^"'`]+)["'`]/);
            const descMatch = toolString.match(/description:\s*["'`]([^"'`]+)["'`]/);
            
            if (nameMatch) {
              const toolName = nameMatch[1];
              const tool = {
                name: toolName,
                description: descMatch ? descMatch[1] : '',
                inputSchema: this.extractInputSchema(toolString)
              };

              const { errors, warnings } = this.validateToolSchema(tool, toolName, serverName);
              this.errors.push(...errors);
              this.warnings.push(...warnings);
            }
          } catch (error) {
            this.warnings.push(`${serverName}: Could not parse tool ${index + 1}: ${error.message}`);
          }
        });
      }
    } catch (error) {
      this.warnings.push(`${serverName}: Error parsing tools: ${error.message}`);
    }
  }

  extractInputSchema(toolString) {
    // Extract inputSchema object (simplified)
    const schemaMatch = toolString.match(/inputSchema:\s*\{([\s\S]*?)\}(?=\s*\},?\s*\{|\s*\}?\s*$)/);
    if (!schemaMatch) return null;

    try {
      // Basic structure validation
      const schemaString = schemaMatch[1];
      const typeMatch = schemaString.match(/type:\s*["'`]([^"'`]+)["'`]/);
      
      return {
        type: typeMatch ? typeMatch[1] : 'object',
        properties: {}, // Simplified - would need more complex parsing
        required: [] // Simplified
      };
    } catch (error) {
      return null;
    }
  }

  extractAndValidateToolsFromToolsFile(content, serverName, fileName) {
    // Look for method definitions that might be tools
    const methodMatches = content.match(/async\s+(\w+)\s*\([^)]*\)/g);
    
    if (methodMatches) {
      methodMatches.forEach(methodMatch => {
        const methodName = methodMatch.match(/async\s+(\w+)/)[1];
        
        // Skip non-tool methods
        if (['constructor', 'handleToolCall', 'handleError'].includes(methodName)) {
          return;
        }

        // Check if this method validates its parameters
        const methodStart = content.indexOf(methodMatch);
        const methodBody = this.extractMethodBody(content, methodStart);
        
        if (methodBody.includes('throw new Error') && methodBody.includes('Missing required')) {
          // This suggests proper parameter validation
        } else {
          this.warnings.push(`${serverName}:${fileName}: Method "${methodName}" should validate required parameters`);
        }
      });
    }
  }

  extractMethodBody(content, startIndex) {
    let braceCount = 0;
    let i = content.indexOf('{', startIndex);
    if (i === -1) return '';

    const start = i;
    braceCount = 1;
    i++;

    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      i++;
    }

    return content.substring(start, i);
  }

  async validate() {
    console.log('🔍 Validating MCP Tool Schemas...\n');

    const projectRoot = process.cwd();
    
    // Validate Apollo MCP Server
    const apolloPath = path.join(projectRoot, 'apollo-io-mcp-server');
    if (fs.existsSync(apolloPath)) {
      await this.validateServerTools(apolloPath, 'apollo-io-mcp-server');
    }

    // Validate Avainode MCP Server
    const avainodePath = path.join(projectRoot, 'avainode-mcp-server');
    if (fs.existsSync(avainodePath)) {
      await this.validateServerTools(avainodePath, 'avainode-mcp-server');
    }

    // Report results
    this.reportResults();
    
    return this.errors.length === 0;
  }

  reportResults() {
    console.log('\n📊 MCP Schema Validation Results');
    console.log('================================');

    if (this.errors.length === 0) {
      console.log('✅ No schema validation errors found!');
    } else {
      console.log(`❌ Found ${this.errors.length} error(s):`);
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Found ${this.warnings.length} warning(s):`);
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    console.log('\n📋 Schema Validation Guidelines:');
    console.log('- Tool names should use kebab-case (e.g., "search-aircraft")');
    console.log('- All tools must have name, description, and inputSchema');
    console.log('- Descriptions should be descriptive (min 10 characters)');
    console.log('- Input schemas must be objects with properties');
    console.log('- All properties should have types and descriptions');
    console.log('- Required fields must exist in properties');
    console.log('- Enum values must be arrays');
    console.log('- Array properties must have items definitions');
  }
}

async function main() {
  const validator = new MCPSchemaValidator();
  const isValid = await validator.validate();
  
  if (!isValid) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = MCPSchemaValidator;