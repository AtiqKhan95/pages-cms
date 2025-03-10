import YAML from "yaml";
import { getFileExtension, extensionCategories } from "@/lib/utils/file";
import { ConfigSchema } from "@/lib/configSchema";
import { z } from "zod";

const configVersion = "2.0";

const parseConfig = (content: string) => {
  const document = YAML.parseDocument(content, { strict: false, prettyErrors: false });

  let errors = document.errors.map(error => {
    return {
      severity: "error",
      from: error.pos ? error.pos[0] : null,
      to: error.pos ? error.pos[1] : null,
      message: error.message, // TODO: refine error messages
      yaml: error,
    };
  });
  
  return { document, errors };
};

const normalizeConfig = (configObject: any) => {
  if (!configObject) return {};

  const configObjectCopy = JSON.parse(JSON.stringify(configObject));
  
  // Normalize repositories if present
  if (configObjectCopy?.repositories != null && Array.isArray(configObjectCopy.repositories)) {
    configObjectCopy.repositories = configObjectCopy.repositories.map((repo: any) => {
      // Ensure path is properly formatted
      if (repo.path && repo.path !== "/") {
        repo.path = repo.path.replace(/^\/|\/$/g, "");
      }
      return repo;
    });
    
    // Add a default main repository if not present
    const hasMainRepo = configObjectCopy.repositories.some((repo: any) => repo.path === "/" || repo.path === "");
    if (!hasMainRepo && configObjectCopy.owner && configObjectCopy.repo) {
      configObjectCopy.repositories.unshift({
        name: "Main Repository",
        repo: configObjectCopy.repo,
        owner: configObjectCopy.owner,
        path: "/"
      });
    }
  } else if (configObjectCopy.owner && configObjectCopy.repo) {
    // Create a default repositories array if not present
    configObjectCopy.repositories = [{
      name: "Main Repository",
      repo: configObjectCopy.repo,
      owner: configObjectCopy.owner,
      path: "/"
    }];
  }
  
  // Normalize media configuration
  if (configObjectCopy?.media != null) {
    if (typeof configObjectCopy.media === "string") {
      // Convert string format to object format
      const relativePath = configObjectCopy.media.replace(/^\/|\/$/g, "");
      configObjectCopy.media = [{
        name: "Main Media",
        input: relativePath,
        output: `/${relativePath}`,
      }];
    } else if (Array.isArray(configObjectCopy.media)) {
      // Normalize array format
      configObjectCopy.media = configObjectCopy.media.map((mediaItem: any) => {
        // Make sure input is relative
        if (mediaItem.input) {
          mediaItem.input = mediaItem.input.replace(/^\/|\/$/g, "");
        }
        
        // Make sure output doesn't have a trailing slash
        if (mediaItem.output && mediaItem.output !== "/") {
          mediaItem.output = mediaItem.output.replace(/\/$/, "");
        }
        
        // Convert categories to extensions if needed
        if (mediaItem.categories != null) {
          if (mediaItem.extensions != null) {
            delete mediaItem.categories;
          } else if (Array.isArray(mediaItem.categories)) {
            mediaItem.extensions = [];
            mediaItem.categories.forEach((category: string) => {
              if (extensionCategories[category] != null) {
                mediaItem.extensions = mediaItem.extensions.concat(extensionCategories[category]);
              }
            });
            delete mediaItem.categories;
          }
        }
        
        return mediaItem;
      });
    } else {
      // Convert legacy object format to array format
      const mediaObject = { ...configObjectCopy.media };
      
      // Make sure input is relative
      if (mediaObject.input != null && typeof mediaObject.input === "string") {
        mediaObject.input = mediaObject.input.replace(/^\/|\/$/g, "");
      }
      
      // Make sure output doesn't have a trailing slash
      if (mediaObject.output != null && mediaObject.output !== "/" && typeof mediaObject.output === "string") {
        mediaObject.output = mediaObject.output.replace(/\/$/, "");
      }
      
      // Convert categories to extensions if needed
      if (mediaObject.categories != null) {
        if (mediaObject.extensions != null) {
          delete mediaObject.categories;
        } else if (Array.isArray(mediaObject.categories)) {
          mediaObject.extensions = [];
          mediaObject.categories.forEach((category: string) => {
            if (extensionCategories[category] != null) {
              mediaObject.extensions = mediaObject.extensions.concat(extensionCategories[category]);
            }
          });
          delete mediaObject.categories;
        }
      }
      
      configObjectCopy.media = [{
        name: "Main Media",
        ...mediaObject
      }];
    }
  }

  // Normalize content configuration
  if (configObjectCopy.content && Array.isArray(configObjectCopy?.content) && configObjectCopy.content.length > 0) {
    configObjectCopy.content = configObjectCopy.content.map((item: any) => {
      // Ensure path is properly formatted
      if (item.path != null) {
        item.path = item.path.replace(/^\/|\/$/g, "");
      }
      
      // Set default filename for collections
      if (item.filename == null && item.type === "collection") {
        item.filename = "{year}-{month}-{day}-{primary}.md";
      }
      
      // Determine file extension
      if (item.extension == null) {
        const filename = item.type === "file" ? item.path : item.filename;
        item.extension = getFileExtension(filename);
      }
      
      // Determine format based on extension
      if (item.format == null) {
        item.format = "raw";
        const codeExtensions = ["yaml", "yml", "javascript", "js", "jsx", "typescript", "ts", "tsx", "json", "html", "htm", "markdown", "md", "mdx"];
        if (item.fields?.length > 0) {
          switch (item.extension) {
            case "json":
              item.format = "json";
              break;
            case "toml":
              item.format = "toml";
              break;
            case "yaml":
            case "yml":
              item.format = "yaml";
              break;
            default:
              // TODO: should we default to this or only consider "markdown", "md", "mdx" and "html"
              // This may catch things like csv or xml for example, which is acceptable IMO (e.g. sitemap.xml)
              item.format = "yaml-frontmatter";
              break;
          }
        } else if (codeExtensions.includes(item.extension)) {
          item.format = "code";
        } else if (item.extension === "csv") {
          item.format = "datagrid";
        }
      }
      
      // If repository is not specified, default to "Main Repository"
      if (!item.repository && configObjectCopy.repositories?.length > 0) {
        item.repository = configObjectCopy.repositories[0].name;
      }
      
      return item;
    });
  }

  return configObjectCopy;
}

const validateConfig = (document: YAML.Document.Parsed) => {
  const content = document.toJSON();
  let errors: any[] = [];

  try {
    ConfigSchema.parse(content);
  } catch (zodError: any) {
    if (zodError instanceof z.ZodError) {
      zodError.errors.forEach(error => {
        processZodError(error, document, errors);    
      });
    }
  }
  
  return errors;
};

const processZodError = (error: any, document: YAML.Document.Parsed, errors: any[]) => {
  let path = error.path;
  let yamlNode: any = document.getIn(path, true);
  let range = [0, 0];

  switch (error.code) {
    case "invalid_union":
      let invalidUnionCount = 0;
      let invalidUnionMessage = "";
      error.unionErrors.forEach((unionError: any) => {
        unionError.issues.forEach((issue: any) => {
          if (issue.path.length === error.path.length) {
            invalidUnionCount++;
            invalidUnionMessage = issue.message;
          } else {
            processZodError(issue, document, errors);
          }
        });
      });
      if (invalidUnionCount === error.unionErrors.length) {
        // If all entries in the union were invalid types, assume none of the schemas could validate the type.
        yamlNode = document.getIn(error.path, true);
        range = yamlNode && yamlNode.range ? yamlNode.range : [0, 0];
        errors.push({
          code: error.code,
          severity: "error",
          from: range[0] || null,
          to: range[1] || null,
          message: invalidUnionMessage,
        });
      }
      break;

    case "unrecognized_keys":
      error.keys.forEach((key: string) => {
        const parentNode = yamlNode && yamlNode.items && yamlNode.items.find((item: any) => item.key.value === key);
        if (parentNode) {
          // TODO: investigate why/when parentNode isn't defined, we may want to leave to YAML parser error
          errors.push({
            severity: "warning",
            from: parentNode.key.range[0] || null,
            to: parentNode.key.range[1] || null,
            message: `Property '${parentNode.key.value}' isn't valid and will be ignored.`,
          });
        }
      });
      break;

    default:
      if (yamlNode?.range == null) {
        path = error.path.slice(0, -1);
        yamlNode = document.getIn(path, true);
      }
      range = yamlNode && yamlNode.range ? yamlNode.range : [0, 0];
      errors.push({
        code: error.code,
        severity: "error",
        from: range[0] || null,
        to: range[1] || null,
        message: error.message,
      });
      break;
  }
};

const parseAndValidateConfig = (content: string) => {
  const { document, errors: parseErrors } = parseConfig(content);
  const validationErrors = validateConfig(document);
  return { document, parseErrors, validationErrors };
};

export { configVersion, parseConfig, normalizeConfig, validateConfig, parseAndValidateConfig };
