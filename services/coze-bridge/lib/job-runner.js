const path = require('path');
const { runPipeline } = require('./pipeline-runner');
const { runSkillFlow } = require('./skill-mode-runner');

const executeJob = (options) => {
  const mode = options.mode || 'pipeline';
  if (mode === 'skills') {
    return runSkillFlow({
      ...options,
      scoreScript: options.scoreScript
        ? path.resolve(options.scoreScript)
        : path.resolve(__dirname, '../skills/score-standard.js'),
    });
  }
  return runPipeline(options);
};

module.exports = {
  executeJob,
};
