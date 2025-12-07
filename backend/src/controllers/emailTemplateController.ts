import { Request, Response } from 'express';
import EmailTemplate from '../models/EmailTemplate';
import { sendEmail } from '../services/emailService';

// Get all email templates
export const getAllTemplates = async (req: Request, res: Response) => {
    try {
        const templates = await EmailTemplate.find();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch templates' });
    }
};

// Get a single template
export const getTemplate = async (req: Request, res: Response) => {
    try {
        const { templateName } = req.params;
        const template = await EmailTemplate.findOne({ name: templateName });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch template' });
    }
};

// Update email template
export const updateTemplate = async (req: Request, res: Response) => {
    try {
        const { templateName } = req.params;
        const { subject, htmlBody, textBody } = req.body;

        let template = await EmailTemplate.findOne({ name: templateName });
        if (!template) {
            // Create template if it doesn't exist
            template = await EmailTemplate.create({
                name: templateName,
                subject,
                htmlBody,
                textBody,
                variables: extractVariables(htmlBody)
            });
        } else {
            template.subject = subject;
            template.htmlBody = htmlBody;
            template.textBody = textBody;
            template.variables = extractVariables(htmlBody);
            await template.save();
        }

        res.json({ message: 'Template updated', template });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update template' });
    }
};

// Send test email with template
export const sendTestTemplateEmail = async (req: Request, res: Response) => {
    try {
        const { templateName } = req.params;
        const { testEmail, testData } = req.body;

        const template = await EmailTemplate.findOne({ name: templateName });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        // Replace variables with test data
        let html = template.htmlBody;
        let text = template.textBody;
        let subject = template.subject;

        if (testData) {
            Object.keys(testData).forEach(key => {
                const placeholder = `{{${key}}}`;
                html = html.replace(new RegExp(placeholder, 'g'), testData[key]);
                text = text.replace(new RegExp(placeholder, 'g'), testData[key]);
                subject = subject.replace(new RegExp(placeholder, 'g'), testData[key]);
            });
        }

        await sendEmail(testEmail, subject, html, text);
        res.json({ message: 'Test email sent successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to extract variables from template
function extractVariables(text: string): string[] {
    const regex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }
    return variables;
}
