const { z } = require('zod');

const optionalUrl = z.string().url('Must be a valid URL.').or(z.literal('')).nullish();
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format.');

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name cannot be empty.').max(150, 'Full name must not exceed 150 characters.').nullish(),
  avatar: z.string().trim().max(500).nullish(),
  avater: z.string().trim().max(500).nullish(),
  job_title: z.string().trim().max(150).nullish(),
  date_of_birth: dateString.nullish(),
  gender: z.enum(['male', 'female', 'other']).nullish(),
  country: z.string().trim().max(100).nullish(),
  state: z.string().trim().max(100).nullish(),
  city: z.string().trim().max(100).nullish(),
  github_url: optionalUrl,
  linkedin_url: optionalUrl,
  portfolio_url: optionalUrl,
  military_status: z.string().trim().max(50).nullish(),
  years_of_experience: z.coerce.number().min(0).max(50).nullish(),
  looking_status: z.enum(['actively_looking', 'casually_looking', 'not_looking']).nullish(),
  professional_summary: z.string().trim().max(5000).nullish()
});

const updateCareerPreferencesSchema = z.object({
  target_role: z.string().trim().max(150).nullish(),
  target_roles: z.array(z.string().trim()).nullish(),
  job_type: z.string().trim().max(50).nullish(),
  work_mode: z.string().trim().max(50).nullish(),
  preferred_country: z.string().trim().max(100).nullish(),
  preferred_city: z.string().trim().max(100).nullish(),
  experience_level: z.string().trim().max(50).nullish(),
  career_goal: z.string().trim().max(2000).nullish(),
  open_to_relocation: z.boolean().nullish(),
  preferred_industries: z.array(z.string().trim()).nullish()
});

const baseEducationObject = z.object({
  institution: z.string({ required_error: 'The institution field is required.' }).trim().min(1).max(200),
  degree: z.string({ required_error: 'The degree field is required.' }).trim().min(1).max(150),
  field_of_study: z.string({ required_error: 'The field of study field is required.' }).trim().min(1).max(150),
  education_level: z.string().trim().max(50).nullish(),
  start_date: dateString,
  end_date: dateString.nullish(),
  is_current: z.boolean().default(false),
  grade: z.string().trim().max(50).nullish(),
  description: z.string().trim().max(2000).nullish(),
  source: z.enum(['manual', 'cv']).default('manual')
});

const educationDateRefine = (data) => {
  if (data.is_current) return true;
  if (!data.end_date || !data.start_date) return true;
  return new Date(data.end_date) >= new Date(data.start_date);
};

const educationSchema = baseEducationObject.refine(educationDateRefine, {
  message: 'The end date must be a date after or equal to start date.',
  path: ['end_date']
});

const updateEducationSchema = baseEducationObject.partial().refine(educationDateRefine, {
  message: 'The end date must be a date after or equal to start date.',
  path: ['end_date']
});

const baseExperienceObject = z.object({
  job_title: z.string({ required_error: 'The job title field is required.' }).trim().min(1).max(150),
  company_name: z.string({ required_error: 'The company name field is required.' }).trim().min(1).max(150),
  employment_type: z.string().trim().max(50).nullish(),
  country: z.string().trim().max(100).nullish(),
  city: z.string().trim().max(100).nullish(),
  start_date: dateString,
  end_date: dateString.nullish(),
  is_current: z.boolean().default(false),
  description: z.string().trim().max(5000).nullish(),
  technologies: z.array(z.string().trim()).nullish(),
  source: z.enum(['manual', 'cv']).default('manual')
});

const experienceDateRefine = (data) => {
  if (data.is_current) return true;
  if (!data.end_date || !data.start_date) return true;
  return new Date(data.end_date) >= new Date(data.start_date);
};

const experienceSchema = baseExperienceObject.refine(experienceDateRefine, {
  message: 'The end date must be a date after or equal to start date.',
  path: ['end_date']
});

const updateExperienceSchema = baseExperienceObject.partial().refine(experienceDateRefine, {
  message: 'The end date must be a date after or equal to start date.',
  path: ['end_date']
});

const baseProjectObject = z.object({
  name: z.string({ required_error: 'The project name field is required.' }).trim().min(1).max(150),
  description: z.string().trim().max(5000).nullish(),
  technologies: z.array(z.string().trim()).nullish(),
  project_url: optionalUrl,
  github_url: optionalUrl,
  start_date: dateString.nullish(),
  end_date: dateString.nullish(),
  source: z.enum(['manual', 'cv']).default('manual')
});

const projectDateRefine = (data) => {
  if (!data.start_date || !data.end_date) return true;
  return new Date(data.end_date) >= new Date(data.start_date);
};

const projectSchema = baseProjectObject.refine(projectDateRefine, {
  message: 'The end date must be a date after or equal to start date.',
  path: ['end_date']
});

const updateProjectSchema = baseProjectObject.partial().refine(projectDateRefine, {
  message: 'The end date must be a date after or equal to start date.',
  path: ['end_date']
});

const baseCertificateObject = z.object({
  name: z.string({ required_error: 'The certificate name field is required.' }).trim().min(1).max(150),
  issuing_organization: z.string({ required_error: 'The issuing organization field is required.' }).trim().min(1).max(150),
  issue_date: dateString.nullish(),
  expiration_date: dateString.nullish(),
  credential_id: z.string().trim().max(100).nullish(),
  credential_url: optionalUrl,
  source: z.enum(['manual', 'cv']).default('manual')
});

const certificateSchema = baseCertificateObject;
const updateCertificateSchema = baseCertificateObject.partial();

const baseLanguageObject = z.object({
  language: z.string({ required_error: 'The language field is required.' }).trim().min(1).max(100),
  proficiency: z.enum(['basic', 'conversational', 'fluent', 'native']).default('conversational'),
  source: z.enum(['manual', 'cv']).default('manual')
});

const languageSchema = baseLanguageObject;
const updateLanguageSchema = baseLanguageObject.partial();

module.exports = {
  updateProfileSchema,
  updateCareerPreferencesSchema,
  educationSchema,
  updateEducationSchema,
  experienceSchema,
  updateExperienceSchema,
  projectSchema,
  updateProjectSchema,
  certificateSchema,
  updateCertificateSchema,
  languageSchema,
  updateLanguageSchema
};
