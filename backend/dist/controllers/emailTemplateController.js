"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestTemplateEmail = exports.updateTemplate = exports.getTemplate = exports.getAllTemplates = void 0;
const prisma_1 = require("../prisma");
const emailService_1 = require("../services/emailService");
// Get all email templates
const getAllTemplates = async (req, res) => {
    try {
        const templates = await prisma_1.prisma.emailTemplate.findMany();
        res.json(templates);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch templates' });
    }
};
exports.getAllTemplates = getAllTemplates;
// Get a single template
const getTemplate = async (req, res) => {
    try {
        const { templateName } = req.params;
        const template = await prisma_1.prisma.emailTemplate.findUnique({
            where: { name: templateName }
        });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json(template);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch template' });
    }
};
exports.getTemplate = getTemplate;
// Update email template
const updateTemplate = async (req, res) => {
    try {
        const { templateName } = req.params;
        const { subject, htmlBody, textBody } = req.body;
        const variables = extractVariables(htmlBody);
        let template = await prisma_1.prisma.emailTemplate.findUnique({
            where: { name: templateName }
        });
        if (!template) {
            // Create template if it doesn't exist
            template = await prisma_1.prisma.emailTemplate.create({
                data: {
                    name: templateName,
                    subject,
                    htmlBody,
                    textBody,
                    variables
                }
            });
        }
        else {
            template = await prisma_1.prisma.emailTemplate.update({
                where: { name: templateName },
                data: {
                    subject,
                    htmlBody,
                    textBody,
                    variables
                }
            });
        }
        res.json({ message: 'Template updated', template });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update template' });
    }
};
exports.updateTemplate = updateTemplate;
// Send test email with template
const sendTestTemplateEmail = async (req, res) => {
    try {
        const { templateName } = req.params;
        const { testEmail, testData } = req.body;
        const template = await prisma_1.prisma.emailTemplate.findUnique({
            where: { name: templateName }
        });
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
        await (0, emailService_1.sendEmail)(testEmail, subject, html, text);
        res.json({ message: 'Test email sent successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.sendTestTemplateEmail = sendTestTemplateEmail;
// Helper function to extract variables from template
function extractVariables(text) {
    const regex = /{{(\w+)}}/g;
    const variables = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }
    return variables;
}
