import { injectable } from 'inversify';
import { IMailProvider, Mail } from './IMailProvider';

/**
 * Modo test: em vez de enviar o e-mail, imprime no console. Funciona sem internet.
 * Devolve null porque não existe link de visualização (o e-mail já está no console).
 */
@injectable()
export class ConsoleMailProvider implements IMailProvider {
  async sendMail(mail: Mail): Promise<string | null> {
    console.log(
      [
        '',
        '========== E-MAIL (ConsoleMailProvider) ==========',
        `Para:    ${mail.to}`,
        `Assunto: ${mail.subject}`,
        `Texto:   ${mail.text}`,
        'HTML:',
        mail.html.trim(),
        '==================================================',
        '',
      ].join('\n'),
    );
    return null;
  }
}
