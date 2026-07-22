UPDATE skills
SET publisher_name = 'GOKUI Labs',
    skill_markdown = replace(skill_markdown, 'ExpertOS Labs', 'GOKUI Labs'),
    updated_at = '2026-07-22T00:00:00.000Z'
WHERE publisher_name = 'ExpertOS Labs';
