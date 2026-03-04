import { Cliente } from "./types";

interface TemplateData {
  cliente: Cliente;
  dia: string;
  mes: string;
  ano: string;
}

function cond(value: string | null | undefined, phrase: string): string {
  if (!value || !value.trim()) return "";
  return phrase.replace(/\{valor\}/g, value);
}

export function renderContratoHTML(data: TemplateData): string {
  const { cliente, dia, mes, ano } = data;
  const nome = cliente.nome_completo?.toUpperCase() || "_______________";

  // Build the qualification paragraph with intelligent omission
  const qualParts: string[] = [];
  qualParts.push(`<strong>${nome}</strong>`);
  if (cliente.nacionalidade) qualParts.push(cliente.nacionalidade);
  if (cliente.estado_civil) qualParts.push(cliente.estado_civil);
  if (cliente.profissao) qualParts.push(cliente.profissao);
  if (cliente.rg) {
    let rgPhrase = `portador(a) do RG nº ${cliente.rg}`;
    if (cliente.orgao_expedidor) rgPhrase += ` ${cliente.orgao_expedidor}`;
    qualParts.push(rgPhrase);
  }
  if (cliente.cpf) qualParts.push(`inscrito(a) no CPF sob o nº ${cliente.cpf}`);
  if (cliente.endereco_cep) qualParts.push(`residente e domiciliado(a) na ${cliente.endereco_cep}`);

  const qualificacao = qualParts.join(", ");

  return `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.8; color: #000; padding: 60px 70px; max-width: 210mm; background: #fff;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 1px;">
      CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS
    </h1>
  </div>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    Pelo presente instrumento particular de contrato de prestação de serviços advocatícios, de um lado, como <strong>CONTRATANTE</strong>: ${qualificacao}, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>;
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    E de outro lado, como <strong>CONTRATADO(A)</strong>: <strong>MARTINS PONTES ADVOGADOS ASSOCIADOS</strong>, inscrito no CNPJ sob o nº XX.XXX.XXX/0001-XX, com sede na Rua XXXXX, nº XX, Sala XX, Centro, Cidade/UF, CEP XXXXX-XXX, neste ato representado por seu sócio-administrador, <strong>Dr. XXXXX</strong>, inscrito na OAB/XX sob o nº XXXXX, doravante denominado simplesmente <strong>CONTRATADO</strong>;
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    Resolvem, de comum acordo, celebrar o presente contrato de prestação de serviços advocatícios, que se regerá pelas cláusulas e condições a seguir estipuladas:
  </p>

  <h2 style="font-size: 12pt; font-weight: bold; text-align: center; margin: 25px 0 15px 0;">CLÁUSULA PRIMEIRA – DO OBJETO</h2>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    O presente contrato tem por objeto a prestação de serviços advocatícios pelo CONTRATADO ao CONTRATANTE, consistentes na representação judicial e/ou extrajudicial em demanda a ser especificada, incluindo a prática de todos os atos processuais necessários à defesa dos interesses do CONTRATANTE.
  </p>

  <h2 style="font-size: 12pt; font-weight: bold; text-align: center; margin: 25px 0 15px 0;">CLÁUSULA SEGUNDA – DOS HONORÁRIOS</h2>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO honorários advocatícios conforme as seguintes condições:
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    <strong>a)</strong> Honorários contratuais fixos no valor de R$ _____________ (_______________), a serem pagos da seguinte forma: _________________;
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    <strong>b)</strong> Honorários de êxito no percentual de _____% (_____ por cento) sobre o proveito econômico obtido em favor do CONTRATANTE, seja por decisão judicial transitada em julgado, acordo ou qualquer outra forma de composição.
  </p>

  <h2 style="font-size: 12pt; font-weight: bold; text-align: center; margin: 25px 0 15px 0;">CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATADO</h2>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    O CONTRATADO obriga-se a:
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 8px;">
    <strong>a)</strong> Prestar os serviços advocatícios com diligência, zelo e competência, observando as normas do Código de Ética e Disciplina da OAB;
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 8px;">
    <strong>b)</strong> Manter o CONTRATANTE informado sobre o andamento do processo e das providências adotadas;
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    <strong>c)</strong> Comparecer às audiências designadas e praticar todos os atos processuais necessários.
  </p>

  <h2 style="font-size: 12pt; font-weight: bold; text-align: center; margin: 25px 0 15px 0;">CLÁUSULA QUARTA – DAS OBRIGAÇÕES DO CONTRATANTE</h2>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    O CONTRATANTE obriga-se a:
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 8px;">
    <strong>a)</strong> Fornecer ao CONTRATADO todos os documentos e informações necessários à condução da demanda;
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 8px;">
    <strong>b)</strong> Efetuar o pagamento dos honorários nos prazos e condições estipulados neste contrato;
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    <strong>c)</strong> Comparecer quando convocado para audiências ou diligências.
  </p>

  <h2 style="font-size: 12pt; font-weight: bold; text-align: center; margin: 25px 0 15px 0;">CLÁUSULA QUINTA – DA VIGÊNCIA E RESCISÃO</h2>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    O presente contrato vigorará até o trânsito em julgado da ação ou até a resolução definitiva da demanda. A rescisão antecipada por qualquer das partes não exime o CONTRATANTE do pagamento dos honorários proporcionais aos serviços já prestados.
  </p>

  <h2 style="font-size: 12pt; font-weight: bold; text-align: center; margin: 25px 0 15px 0;">CLÁUSULA SEXTA – DO FORO</h2>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    Fica eleito o foro da Comarca de _____________, Estado de _____________, para dirimir quaisquer dúvidas oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    E, por estarem justas e contratadas, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença de 02 (duas) testemunhas.
  </p>

  <p style="text-align: right; margin-top: 30px; margin-bottom: 50px;">
    _____________, ${dia} de ${mes} de ${ano}.
  </p>

  <div style="margin-top: 60px;">
    <div style="display: flex; justify-content: space-between; gap: 40px;">
      <div style="flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 8px;">
        <strong>CONTRATANTE</strong><br />
        <span>${cliente.nome_completo || "_______________"}</span>
      </div>
      <div style="flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 8px;">
        <strong>CONTRATADO</strong><br />
        <span>MARTINS PONTES ADVOGADOS ASSOCIADOS</span>
      </div>
    </div>
  </div>

  <div style="margin-top: 50px;">
    <p style="margin-bottom: 5px;"><strong>Testemunhas:</strong></p>
    <div style="display: flex; justify-content: space-between; gap: 40px; margin-top: 30px;">
      <div style="flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 8px;">
        Nome:<br />CPF:
      </div>
      <div style="flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 8px;">
        Nome:<br />CPF:
      </div>
    </div>
  </div>

</div>`;
}

export function renderProcuracaoHTML(data: TemplateData): string {
  const { cliente, dia, mes, ano } = data;
  const nome = cliente.nome_completo?.toUpperCase() || "_______________";

  const qualParts: string[] = [];
  qualParts.push(`<strong>${nome}</strong>`);
  if (cliente.nacionalidade) qualParts.push(cliente.nacionalidade);
  if (cliente.estado_civil) qualParts.push(cliente.estado_civil);
  if (cliente.profissao) qualParts.push(cliente.profissao);
  if (cliente.rg) {
    let rgPhrase = `portador(a) do RG nº ${cliente.rg}`;
    if (cliente.orgao_expedidor) rgPhrase += ` ${cliente.orgao_expedidor}`;
    qualParts.push(rgPhrase);
  }
  if (cliente.cpf) qualParts.push(`inscrito(a) no CPF sob o nº ${cliente.cpf}`);
  if (cliente.endereco_cep) qualParts.push(`residente e domiciliado(a) na ${cliente.endereco_cep}`);

  const qualificacao = qualParts.join(", ");

  return `
<div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.8; color: #000; padding: 60px 70px; max-width: 210mm; background: #fff;">

  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 1px;">
      PROCURAÇÃO AD JUDICIA ET EXTRA
    </h1>
  </div>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    <strong>OUTORGANTE:</strong> ${qualificacao}, pelo presente instrumento particular, nomeia e constitui seu(sua) bastante procurador(a):
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    <strong>OUTORGADO(A):</strong> <strong>Dr(a). XXXXX</strong>, brasileiro(a), advogado(a), inscrito(a) na OAB/XX sob o nº XXXXX, com escritório profissional na Rua XXXXX, nº XX, Sala XX, Centro, Cidade/UF, CEP XXXXX-XXX;
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    A quem confere amplos e gerais poderes para o foro em geral, com a cláusula "ad judicia et extra", para em seu nome representá-lo(a) perante qualquer Juízo, Instância ou Tribunal, podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando os recursos legais e acompanhando-os, conferindo-lhe, ainda, poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre que se funda a ação, receber, dar quitação e firmar compromisso, podendo, ainda, substabelecer esta com ou sem reservas de iguais poderes, dando tudo por bom, firme e valioso.
  </p>

  <p style="text-align: right; margin-top: 30px; margin-bottom: 50px;">
    _____________, ${dia} de ${mes} de ${ano}.
  </p>

  <div style="margin-top: 60px; text-align: center;">
    <div style="display: inline-block; min-width: 300px; border-top: 1px solid #000; padding-top: 8px;">
      <strong>${cliente.nome_completo || "_______________"}</strong><br />
      <span style="font-size: 10pt;">OUTORGANTE</span>
    </div>
  </div>

  <div style="page-break-before: always; margin-top: 40px;"></div>

  <div style="text-align: center; margin-bottom: 30px; margin-top: 40px;">
    <h1 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 1px;">
      DECLARAÇÃO DE HIPOSSUFICIÊNCIA
    </h1>
  </div>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    Eu, ${qualificacao}, <strong>DECLARO</strong>, para os devidos fins de direito, sob as penas da lei, que não possuo condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo do sustento próprio e de minha família, nos termos do art. 98 e seguintes do Código de Processo Civil e do art. 5º, inciso LXXIV, da Constituição Federal.
  </p>

  <p style="text-align: justify; text-indent: 40px; margin-bottom: 14px;">
    Declaro, ainda, que estou ciente de que a falsidade desta declaração poderá implicar nas sanções previstas no art. 299 do Código Penal.
  </p>

  <p style="text-align: right; margin-top: 30px; margin-bottom: 50px;">
    _____________, ${dia} de ${mes} de ${ano}.
  </p>

  <div style="margin-top: 60px; text-align: center;">
    <div style="display: inline-block; min-width: 300px; border-top: 1px solid #000; padding-top: 8px;">
      <strong>${cliente.nome_completo || "_______________"}</strong><br />
      <span style="font-size: 10pt;">DECLARANTE</span>
    </div>
  </div>

</div>`;
}
