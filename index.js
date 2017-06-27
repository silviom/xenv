const templates = require('./lib/templates');
const _ = require('lodash');

module.exports = function(params, envs) {
  if (typeof params !== 'object') {
    throw new Error('params is required');
  }

  if (typeof params.schema !== 'object') {
    throw new Error('schema is required');
  }

  const result = {};

  const schema = _.clone(params.schema);
  const keys = Object.keys(schema);

  keys.forEach(property => {
    if (typeof schema[property].type === 'undefined') { return; }
    schema[property] = templates[schema[property].type](schema[property]);
  });

  //generate the result object
  keys.forEach(property => {
    const config = schema[property];

    if (!config.required && typeof config.default === 'undefined') {
      throw new Error(`${property} must either have a default or be required`);
    }

    if (property in envs) {
      if (config.parse && typeof envs[property] === 'string') {
        result[property] = config.parse(envs[property]);
      } else {
        result[property] = envs[property];
      }
    } else if ('default' in config) {
      result[property] = config.default;
    }
  });

  //validate required properties
  keys.forEach(property => {
    const config = schema[property];

    if (typeof config.required === 'undefined' || property in result) {
      return;
    }

    if (config.required === true) {
      throw new Error(`The required environment variable ${property} has not been defined`);
    }

    if (typeof config.required === 'function' && config.required(result)) {
      throw new Error(`The required environment variable ${property} has not been defined`);
    }
  });

  //validate schemas
  keys.forEach(property => {
    const config = schema[property];

    if (typeof config.validate !== 'function' ||
        typeof result[property] === 'undefined') {
      return;
    }

    if (!config.validate(result[property])) {
      throw new Error(`The environment variable ${property} has been defined with an invalid value`);
    }
  });

  return result;
};
