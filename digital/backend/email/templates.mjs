// Canonical copy and email-safe layout. Generated HTML is pasted into Supabase.
// These templates change presentation only; Auth owns tokens and redirect URLs.
export const EMAIL_VERSION='1.0.1';
export const EMAIL_TEMPLATES=[
  {
    id:'confirmation',name:'Confirm sign up',kind:'link',
    subject:'GeoDecoder · Sahkan e-mel / Verify your email',
    title:'Satu langkah lagi.',englishTitle:'One more step to start exploring.',
    intro:'Selamat datang ke GeoDecoder Digital! Sahkan alamat e-mel anda untuk melengkapkan pendaftaran.',
    englishIntro:'Welcome to GeoDecoder Digital! Verify your email address to complete your registration.',
    button:'Sahkan e-mel saya',englishButton:'Verify my email',
    note:'Selepas pengesahan, kembali ke GeoDecoder dan log masuk untuk menyertai kelas anda.',
    englishNote:'After verification, return to GeoDecoder and sign in to join your class.',
    safety:'Jika anda tidak mendaftar akaun ini, abaikan e-mel ini.',
    englishSafety:'If you did not create this account, you can ignore this email.'
  },
  {
    id:'recovery',name:'Reset password',kind:'link',
    subject:'GeoDecoder · Tetapkan kata laluan / Reset password',
    title:'Kembali ke akaun anda.',englishTitle:'Let’s get you back in.',
    intro:'Kami menerima permintaan untuk menetapkan semula kata laluan akaun GeoDecoder anda.',
    englishIntro:'We received a request to reset your GeoDecoder account password.',
    button:'Tetapkan kata laluan baharu',englishButton:'Set a new password',
    note:'Pautan ini hanya boleh digunakan sekali. Jika pautan tamat, minta pautan baharu melalui Terlupa kata laluan di GeoDecoder.',
    englishNote:'This link can be used once. If it expires, request a new link using Forgot password in GeoDecoder.',
    safety:'Bukan permintaan anda? Abaikan e-mel ini. Kata laluan anda belum berubah.',
    englishSafety:'Did not request this? Ignore this email. Your password has not changed.'
  },
  {
    id:'invite',name:'Invite user',kind:'link',
    subject:'GeoDecoder · Jemputan akaun / Account invitation',
    title:'Anda dijemput meneroka.',englishTitle:'You’re invited to GeoDecoder.',
    intro:'Anda menerima jemputan untuk membuat akaun GeoDecoder Digital. Buka pautan di bawah untuk meneruskan.',
    englishIntro:'You have been invited to create a GeoDecoder Digital account. Open the link below to continue.',
    button:'Terima jemputan akaun',englishButton:'Accept account invitation',
    note:'Jemputan akaun ini tidak mendaftarkan anda ke mana-mana kelas secara automatik.',
    englishNote:'This account invitation does not automatically enrol you in a class.',
    safety:'Jika anda tidak menjangkakan jemputan ini, abaikan e-mel ini.',
    englishSafety:'If you were not expecting this invitation, you can ignore this email.'
  },
  {
    id:'magic_link',name:'Magic link or OTP',kind:'link',
    subject:'GeoDecoder · Pautan log masuk / Sign-in link',
    title:'Pautan masuk anda.',englishTitle:'Your way back to GeoDecoder.',
    intro:'Gunakan pautan di bawah untuk log masuk ke akaun GeoDecoder anda.',
    englishIntro:'Use the link below to sign in to your GeoDecoder account.',
    button:'Log masuk ke GeoDecoder',englishButton:'Sign in to GeoDecoder',
    note:'Pautan ini hanya boleh digunakan sekali. Jangan kongsi atau majukan pautan ini kepada orang lain.',
    englishNote:'This link can be used once. Do not share or forward it to anyone.',
    safety:'Jika anda tidak meminta pautan log masuk, abaikan e-mel ini.',
    englishSafety:'If you did not request a sign-in link, you can ignore this email.'
  },
  {
    id:'email_change',name:'Change email address',kind:'link',
    subject:'GeoDecoder · Sahkan perubahan e-mel / Confirm email change',
    title:'Sahkan perubahan e-mel.',englishTitle:'Confirm your email change.',
    intro:'Sahkan permintaan menukar alamat e-mel akaun GeoDecoder anda kepada alamat berikut:',
    englishIntro:'Confirm the request to change your GeoDecoder account email to the address below:',
    detail:'{{ .NewEmail }}',
    button:'Sahkan perubahan e-mel',englishButton:'Confirm email change',
    note:'Jika pengesahan dua alamat diaktifkan, lengkapkan pengesahan pada alamat lama dan baharu.',
    englishNote:'If confirmation on both addresses is enabled, complete verification on your old and new addresses.',
    safety:'Bukan permintaan anda? Jangan buka pautan ini. Buka GeoDecoder sendiri dan semak keselamatan akaun.',
    englishSafety:'Did not request this? Do not open this link. Open GeoDecoder directly and review your account security.'
  },
  {
    id:'reauthentication',name:'Reauthentication',kind:'code',
    subject:'GeoDecoder · Kod pengesahan / Verification code',
    title:'Sahkan identiti anda.',englishTitle:'Verify it’s really you.',
    intro:'Masukkan kod berikut pada halaman GeoDecoder yang meminta pengesahan identiti anda.',
    englishIntro:'Enter this code on the GeoDecoder page that requested identity verification.',
    note:'Kod ini hanya boleh digunakan sekali. Jika kod tamat, minta kod baharu melalui GeoDecoder.',
    englishNote:'This code can be used once. If it expires, request a new code in GeoDecoder.',
    safety:'Jangan kongsi kod ini. Jika anda tidak meminta kod, abaikan e-mel ini.',
    englishSafety:'Do not share this code. If you did not request it, ignore this email.'
  },
  {
    id:'password_changed_notification',name:'Password changed',kind:'notification',
    subject:'GeoDecoder · Kata laluan berubah / Password changed',
    title:'Kata laluan dikemas kini.',englishTitle:'Your password was changed.',
    intro:'Kata laluan akaun GeoDecoder anda telah ditukar.',
    englishIntro:'The password for your GeoDecoder account has been changed.',
    button:'Buka GeoDecoder',englishButton:'Open GeoDecoder',
    note:'Jika anda membuat perubahan ini, tiada tindakan lanjut diperlukan.',
    englishNote:'If you made this change, no further action is needed.',
    safety:'Bukan anda? Buka GeoDecoder sendiri, tetapkan semula kata laluan dan log keluar daripada semua peranti.',
    englishSafety:'Was not you? Open GeoDecoder directly, reset your password and sign out of all devices.'
  },
  {
    id:'email_changed_notification',name:'Email address changed',kind:'notification',
    subject:'GeoDecoder · E-mel akaun berubah / Account email changed',
    title:'E-mel akaun dikemas kini.',englishTitle:'Your account email was changed.',
    intro:'Alamat e-mel akaun GeoDecoder anda telah ditukar.',
    englishIntro:'Your GeoDecoder account email address has been changed.',
    detail:'{{ .OldEmail }} → {{ .Email }}',
    button:'Buka GeoDecoder',englishButton:'Open GeoDecoder',
    note:'Jika anda membuat perubahan ini, gunakan alamat e-mel baharu untuk log masuk.',
    englishNote:'If you made this change, use your new email address to sign in.',
    safety:'Bukan anda? Buka GeoDecoder sendiri dan semak keselamatan akaun dengan segera.',
    englishSafety:'Was not you? Open GeoDecoder directly and review your account security immediately.'
  }
];

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const copy=(text,english=false,style='')=>`<p${english?' lang="en"':''} style="margin:0 0 12px;font-size:${english?'14':'16'}px;line-height:1.6;color:${english?'#526A7D':'#18334B'};${style}">${escape(text)}</p>`;
const button=(item,url)=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:24px 0 20px;table-layout:fixed;"><tr><td align="center" bgcolor="#215FF0" style="border-radius:12px;background-color:#215FF0;"><a href="${url}" style="display:block;padding:16px 18px;border:1px solid #215FF0;border-radius:12px;background-color:#215FF0;color:#FFFFFF;font-size:17px;line-height:1.5;font-weight:700;text-align:center;text-decoration:none;word-wrap:break-word;">${escape(item.button)}<br><span lang="en" style="font-size:13px;font-weight:400;color:#FFFFFF;">${escape(item.englishButton)}</span></a></td></tr></table>`;

export function renderEmail(item){
  const action=item.kind==='code'
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:24px 0;table-layout:fixed;"><tr><td align="center" bgcolor="#F3F7FB" style="padding:22px 12px;border:1px solid #D9E4ED;border-radius:12px;"><p style="margin:0 0 8px;color:#526A7D;font-size:13px;">Kod pengesahan <span lang="en">/ Verification code</span></p><p style="margin:0;color:#18334B;font-family:Consolas,monospace;font-size:32px;letter-spacing:6px;line-height:1.5;">{{ .Token }}</p></td></tr></table>`
    : button(item,item.kind==='link'?'{{ .ConfirmationURL }}':'{{ .SiteURL }}');
  const fallback=item.kind==='link'
    ? `<tr><td class="content" style="padding:0 32px 28px;word-break:break-word;overflow-wrap:anywhere;">${copy('Butang tidak berfungsi? Salin pautan ini ke pelayar anda.',false,'font-size:13px;margin-bottom:4px;')}${copy('Button not working? Copy this link into your browser.',true,'font-size:12px;margin-bottom:8px;')}<a href="{{ .ConfirmationURL }}" style="color:#215FF0;font-size:12px;line-height:1.6;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">{{ .ConfirmationURL }}</a></td></tr>`
    : '';
  return `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escape(item.subject)}</title>
  <style>
    a:focus { outline:3px solid #18334B; outline-offset:3px; }
    @media only screen and (max-width:480px) {
      .outer { padding:12px 8px !important; }
      .content { padding-left:20px !important; padding-right:20px !important; }
      .headline { font-size:28px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#F3F7FB;color:#18334B;font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <div aria-hidden="true" style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;mso-hide:all;">${escape(item.intro)} ${escape(item.englishIntro)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3F7FB" style="width:100%;table-layout:fixed;background-color:#F3F7FB;">
    <tr><td class="outer" align="center" style="padding:32px 16px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:100%;max-width:600px;table-layout:fixed;background-color:#FFFFFF;border:1px solid #D9E4ED;border-radius:24px;box-shadow:0 16px 48px #18334B12;">
        <tr><td height="6" bgcolor="#FFCB66" style="height:6px;background-color:#FFCB66;border-radius:24px 24px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td class="content" style="padding:28px 32px 28px;background-color:#18334B;border-radius:24px 24px 0 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="44" height="44" align="center" bgcolor="#215FF0" aria-hidden="true" style="width:44px;height:44px;background-color:#215FF0;border-radius:12px;color:#FFFFFF;font-family:'Trebuchet MS',Arial,sans-serif;font-size:28px;font-weight:700;">◇</td>
            <td style="padding-left:12px;color:#FFFFFF;"><p style="margin:0;font-family:'Trebuchet MS',Arial,sans-serif;font-size:19px;font-weight:700;line-height:1.3;">GeoDecoder</p><p style="margin:3px 0 0;color:#FFCB66;font-size:10px;font-weight:700;letter-spacing:3px;line-height:1.4;">DIGITAL</p></td>
          </tr></table>
        </td></tr>
        <tr><td class="content" style="padding:32px 32px 12px;">
          <p style="margin:0 0 16px;color:#526A7D;font-size:11px;font-weight:700;letter-spacing:1px;line-height:1.6;"><span style="color:#215FF0;">●</span> AKAUN GEODECODER <span lang="en">/ ACCOUNT</span></p>
          <h1 class="headline" style="margin:0 0 6px;color:#18334B;font-family:'Trebuchet MS',Arial,sans-serif;font-size:38px;font-weight:700;line-height:1.2;">${escape(item.title)}</h1>
          <p lang="en" style="margin:0 0 24px;color:#526A7D;font-size:18px;line-height:1.5;">${escape(item.englishTitle)}</p>
          <table role="presentation" width="48" cellpadding="0" cellspacing="0" border="0" style="width:48px;margin-bottom:24px;"><tr><td height="4" bgcolor="#FFCB66" style="height:4px;background-color:#FFCB66;font-size:0;line-height:0;">&nbsp;</td></tr></table>
          ${copy(item.intro)}
          ${copy(item.englishIntro)}
          ${item.detail?copy(item.detail,false,'font-weight:700;word-break:break-all;overflow-wrap:anywhere;'):''}
          <p style="margin:20px 0 0;padding:16px 18px;border-left:3px solid #215FF0;background-color:#F3F7FB;border-radius:0 12px 12px 0;color:#526A7D;font-size:13px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;">Akaun <span lang="en">/ Account</span><br><strong style="color:#18334B;font-size:14px;">{{ .Email }}</strong></p>
          ${action}
          ${copy(item.note,false,'font-size:14px;margin-bottom:6px;')}
          ${copy(item.englishNote,true,'font-size:13px;margin-bottom:16px;')}
        </td></tr>
        ${fallback}
        <tr><td class="content" style="padding:0 32px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFF8E9" style="width:100%;table-layout:fixed;border:1px solid #F0D9A6;border-radius:12px;background-color:#FFF8E9;"><tr><td style="padding:16px;word-wrap:break-word;">
            <p style="margin:0 0 8px;color:#18334B;font-size:13px;font-weight:700;line-height:1.5;">Untuk keselamatan anda <span lang="en">/ For your security</span></p>
            ${copy(item.safety,false,'font-size:13px;margin-bottom:6px;')}
            ${copy(item.englishSafety,true,'font-size:12px;margin-bottom:0;')}
          </td></tr></table>
        </td></tr>
        <tr><td class="content" style="padding:22px 32px;border-top:1px solid #D9E4ED;word-wrap:break-word;">
          <p style="margin:0 0 6px;color:#18334B;font-size:13px;font-weight:700;line-height:1.5;">Belajar. Teroka. Temui. <span lang="en" style="color:#526A7D;font-weight:400;">Learn. Explore. Discover.</span></p>
          <p style="margin:0;color:#526A7D;font-size:12px;line-height:1.7;">E-mel automatik GeoDecoder Digital. <span lang="en">An automated account email from GeoDecoder Digital.</span><br><a href="{{ .SiteURL }}" style="color:#215FF0;text-decoration:underline;">Buka GeoDecoder <span lang="en">/ Open GeoDecoder</span></a></p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>
`.replace(/[ \t]+$/gm,'');
}

export function emailManifest(){
  return {schemaVersion:1,version:EMAIL_VERSION,languages:['ms','en'],templates:EMAIL_TEMPLATES.map(item=>({
    id:item.id,name:item.name,kind:item.kind,subject:item.subject,
    file:`templates/${item.id}.html`,
    subjectKey:`mailer_subjects_${item.id}`,
    contentKey:`mailer_templates_${item.id}_content`
  }))};
}

export function emailPayload(){
  return Object.fromEntries(EMAIL_TEMPLATES.flatMap(item=>[
    [`mailer_subjects_${item.id}`,item.subject],
    [`mailer_templates_${item.id}_content`,renderEmail(item)]
  ]));
}

// Visual fixtures only: no Auth request, real recipient or usable token.
export function previewEmail(item,{longEmail=false}={}){
  const email=longEmail?'x'.repeat(63)+'@'+'a'.repeat(63)+'.'+'b'.repeat(63)+'.'+'c'.repeat(54)+'.invalid':'pelajar@example.invalid';
  const values={Email:email,NewEmail:'new-student@example.invalid',OldEmail:'old-student@example.invalid',Token:'482716',SiteURL:'https://geodecoder.example.invalid/',ConfirmationURL:'https://auth.example.invalid/auth/v1/verify?token=PREVIEW_ONLY_'+ 'x'.repeat(72)+'&type=email&redirect_to=https%3A%2F%2Fgeodecoder.example.invalid%2F'};
  return renderEmail(item).replace(/{{\s*\.(\w+)\s*}}/g,(_,key)=>{
    if(!(key in values))throw Error(`Unknown email placeholder: ${key}`);
    return escape(values[key]);
  });
}
