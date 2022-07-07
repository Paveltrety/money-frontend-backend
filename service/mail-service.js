const nodemailer = require("nodemailer");

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  async sendActivationMail(to, activationLink) {
    await this.transporter.sendMail({
      from: process.env.SMPT_USER,
      to,
      subject: `Активация аккаунта для ${process.env.API_URL}`,
      text: "",
      html: `
        <div>
            <h1>Для активации перейдите по ссылке </h2>
            <a href="${activationLink}">Клик</a>
        </div>
      `,
    });
  }
}

module.exports = new MailService();
