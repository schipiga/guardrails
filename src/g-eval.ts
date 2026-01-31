export const GEVAL_CRITERIA_STEPS = `
Given an evaluation criteria which outlines how you should judge some text, generate 3-4 concise evaluation steps for any text based on the criteria below.

# Evaluation Criteria:
{{criteria}}

**
IMPORTANT: Please make sure to only return in minified JSON format, with the "steps" key as a list of strings. No additional words, explanation or formatting is needed.
Example JSON:
{"steps": <list_of_strings>}
**

JSON:
`;

export const GEVAL_PROMPT_EVALUATE = `
You will be given one Prompt below. Your task is to rate the Prompt on one metric.
Please make sure you read and understand these instructions carefully. Please keep this document open while reviewing, and refer to it as needed.

# Evaluation Criteria:
{{criteria}}

# Evaluation Steps:
- {{steps}}
- Given the evaluation steps, return a JSON with two keys: 1) a "score" key ranging from 0 - {{maxScore}}, with {{maxScore}} being that Prompt follows the Evaluation Criteria outlined in the Evaluation Steps and 0 being that Prompt does not; 2) a "reason" key, a reason for the given score, but DO NOT QUOTE THE SCORE in your reason. Please mention specific information from Prompt in your reason, but be very concise with it!

# Prompt:
{{input}}

**
IMPORTANT: Please make sure to only return in minified JSON format, with the "score" and "reason" key. No additional words, explanation or formatting is needed.

Example JSON:
{"score":0,"reason":"The text of prompt does not follow the evaluation criteria provided."}
**

# JSON:
`;

export const GEVAL_REPLY_EVALUATE = `
You will be given one Reply for a Prompt below. Your task is to rate the Reply on one metric.
Please make sure you read and understand these instructions carefully. Please keep this document open while reviewing, and refer to it as needed.

# Evaluation Criteria:
{{criteria}}

# Evaluation Steps:
- {{steps}}
- Given the evaluation steps, return a JSON with two keys: 1) a "score" key ranging from 0 - {{maxScore}}, with {{maxScore}} being that Reply follows the Evaluation Criteria outlined in the Evaluation Steps and 0 being that Reply does not; 2) a "reason" key, a reason for the given score, but DO NOT QUOTE THE SCORE in your reason. Please mention specific information from Prompt and Reply in your reason, but be very concise with it!

# Prompt:
{{input}}

# Reply:
{{output}}

**
IMPORTANT: Please make sure to only return in minified JSON format, with the "score" and "reason" key. No additional words, explanation or formatting is needed.

Example JSON:
{"score":0,"reason":"The text of reply does not follow the evaluation criteria provided."}
**

# JSON:
`;