-- Update repo_url after GitHub repo rename: vitalii_claude-code-in-browser -> vitalii-no-platform
UPDATE feature_projects
SET repo_url = 'https://github.com/SmmShaman/vitalii-no-platform'
WHERE id = 'portfolio'
  AND repo_url = 'https://github.com/SmmShaman/vitalii_claude-code-in-browser';
