'use server';
/**
 * @fileOverview Generates constructive feedback for a student based on their weekly performance.
 *
 * - generateFeedback - A function that takes student performance data and returns AI-generated feedback.
 * - GenerateFeedbackInput - The input type for the generateFeedback function.
 * - GenerateFeedbackOutput - The return type for the generateFeedback function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const GenerateFeedbackInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  avgParticipation: z
    .number()
    .describe('The average participation score for the week (out of 20).'),
  totalEngagement: z
    .number()
    .describe('The total engagement score for the week (out of 25).'),
  dailyLogs: z
    .array(
      z.object({
        date: z.string(),
        comments: z.string(),
        participationScore: z.number(),
        engagementScore: z.number(),
      })
    )
    .describe('An array of daily logs for the student for the week.'),
});
export type GenerateFeedbackInput = z.infer<typeof GenerateFeedbackInputSchema>;

const GenerateFeedbackOutputSchema = z.object({
  feedback: z
    .string()
    .describe(
      'Constructive feedback for the student based on their performance. It should be concise (2-3 sentences), encouraging, and highlight both strengths and areas for improvement with actionable suggestions.'
    ),
});
export type GenerateFeedbackOutput = z.infer<
  typeof GenerateFeedbackOutputSchema
>;

export async function generateFeedback(
  input: GenerateFeedbackInput
): Promise<GenerateFeedbackOutput> {
  return generateFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFeedbackPrompt',
  input: {schema: GenerateFeedbackInputSchema},
  output: {schema: GenerateFeedbackOutputSchema},
  prompt: `You are a helpful teaching assistant. Your role is to provide constructive, concise, and encouraging feedback for a student based on their weekly performance report. The report includes their average participation score, their total engagement score, and their daily log comments.

Student Name: {{studentName}}
Average Participation Score: {{avgParticipation}}/20
Total Engagement Score: {{totalEngagement}}/25

Daily Logs:
{{#each dailyLogs}}
- {{date}}: {{comments}} (Participation: {{participationScore}}/20, Engagement: {{engagementScore}}/5)
{{/each}}

Based on this data, generate a brief (2-3 sentences) feedback summary. Highlight strengths and identify specific areas for improvement. Be positive and suggest actionable steps if possible. For example, if engagement scores are low due to lack of preparedness, you could suggest strategies for organizing materials.`,
});

const generateFeedbackFlow = ai.defineFlow(
  {
    name: 'generateFeedbackFlow',
    inputSchema: GenerateFeedbackInputSchema,
    outputSchema: GenerateFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
