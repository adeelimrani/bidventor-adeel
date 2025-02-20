import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

export default async function sendMail(to:string, subject:any, text:any) {
  console.log(to, subject, text);
  const emailContent = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: `${subject}`,
    text: `${text}`,
  };
  await sendgrid.send(emailContent);
}
