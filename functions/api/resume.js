/**
 * Pages Function: GET /api/resume
 * Returns resume JSON when the unlock cookie is present.
 */
import { hasAuth } from "../_lib/card.js";

const DEFAULT_RESUME = {
  template: "cyan-a4",
  photo: "/images/christian-dela-cruz.png",
  pdfFilename: "Christian_Joseph_DelaCruz_Resume.pdf",
  pageCount: 2,
  name: "Christian Dela Cruz",
  contact: {
    location: "Dubai, UAE",
    phone: "+639711358319",
    email: "c000business@gmail.com",
    linkedin: "https://www.linkedin.com/in/chris-dc/",
  },
  summary:
    "Junior Data Analyst based in Dubai, UAE, available for freelance work in the Philippines. Digital calling card at chrisdelacruz.com.",
  competencies: [],
  experience: [],
  education: { degree: "", school: "" },
  certifications: [],
  additionalInfo: [],
  sections: {
    photo: true,
    summary: true,
    competencies: true,
    experience: true,
    education: true,
    certifications: true,
    additionalInfo: true,
  },
};

export async function onRequestGet(context) {
  const { request } = context;

  if (!hasAuth(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return Response.json(DEFAULT_RESUME);
}
