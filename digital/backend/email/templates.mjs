// Canonical copy and email-safe layout. Generated HTML is pasted into Supabase.
// These templates change presentation only; Auth owns tokens and redirect URLs.
export const EMAIL_VERSION='1.1.0';
export const EMAIL_TEMPLATES=[
  {
    id:'confirmation',name:'Confirm sign up',kind:'link',
    subject:'GeoDecoder · Sahkan e-mel / Verify your email',
    title:'Sedia untuk meneroka?',englishTitle:'Ready to explore?',
    intro:'Selamat datang! Sahkan e-mel anda untuk melengkapkan pendaftaran GeoDecoder.',
    englishIntro:'Welcome! Verify your email to complete your GeoDecoder registration.',
    button:'Sahkan e-mel',englishButton:'Verify email',
    note:'Selepas pengesahan, log masuk untuk menyertai kelas anda.',
    englishNote:'After verification, sign in to join your class.',
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
// Decoration is built from presentation tables, so blocked remote images cannot hide it.
const geometry=`<table role="presentation" aria-hidden="true" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
  <td width="48" valign="bottom" style="width:48px;padding:0 12px 0 0;"><div style="width:40px;height:40px;border-radius:40px 0 0 0;background-color:#FFCB66;font-size:0;line-height:0;">&nbsp;</div></td>
  <td width="92" height="88" align="center" bgcolor="#215FF0" style="text-align:center;width:92px;height:88px;background-color:#215FF0;border-radius:24px 24px 8px 24px;">
    <table role="presentation" width="52" height="36" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:52px;height:36px;border:2px solid #FFFFFF;border-radius:5px;"><tr><td align="center" valign="top" style="font-size:0;line-height:0;"><div style="width:0;height:0;border-left:24px solid transparent;border-right:24px solid transparent;border-top:17px solid #FFFFFF;font-size:0;line-height:0;">&nbsp;</div></td></tr></table>
  </td>
  <td width="48" valign="top" style="width:48px;padding:0 0 0 12px;"><div style="width:40px;height:40px;border-radius:50%;background-color:#B4E2D1;font-size:0;line-height:0;">&nbsp;</div></td>
</tr></table>`;
const copy=(text,english=false,style='')=>`<p${english?' lang="en"':''} style="margin:0 0 8px;font-size:${english?'13':'15'}px;line-height:1.65;color:${english?'#526A7D':'#18334B'};${style}">${escape(text)}</p>`;
const button=(item,url)=>`<div style="max-width:340px;margin:22px auto 18px;"><table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:340px;margin:0 auto;table-layout:fixed;"><tr><td align="center" bgcolor="#215FF0" style="border-radius:12px;background-color:#215FF0;"><a href="${url}" style="display:block;padding:14px 16px;border:1px solid #215FF0;border-radius:12px;background-color:#215FF0;color:#FFFFFF;font-size:16px;line-height:1.5;font-weight:700;text-align:center;text-decoration:none;word-wrap:break-word;">${escape(item.button)}<br><span lang="en" style="font-size:12px;font-weight:400;color:#FFFFFF;">${escape(item.englishButton)}</span></a></td></tr></table></div>`;

export function renderEmail(item){
  const action=item.kind==='code'
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:22px 0;table-layout:fixed;"><tr><td align="center" bgcolor="#EDF3FF" style="text-align:center;padding:18px 8px;border:1px solid #D9E4ED;border-radius:12px;"><p style="margin:0 0 6px;color:#526A7D;font-size:12px;line-height:1.6;">Kod pengesahan <span lang="en">/ Verification code</span></p><p style="margin:0;color:#18334B;font-family:Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:5px;line-height:1.5;">{{ .Token }}</p></td></tr></table>`
    : button(item,item.kind==='link'?'{{ .ConfirmationURL }}':'{{ .SiteURL }}');
  const fallback=item.kind==='link'
    ? `<p style="margin:20px 0 0;text-align:center;font-size:12px;line-height:1.8;color:#526A7D;">Butang tidak berfungsi? <span lang="en">/ Button not working?</span><br><a href="{{ .ConfirmationURL }}" style="color:#215FF0;text-decoration:underline;">Gunakan pautan ini <span lang="en">/ Use this link</span></a></p>`
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
      .outer { padding:24px 12px !important; }
      .content { padding-left:22px !important; padding-right:22px !important; }
      .headline { font-size:28px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#F3F7FB;color:#18334B;font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <div aria-hidden="true" style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;mso-hide:all;">${escape(item.intro)} ${escape(item.englishIntro)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3F7FB" style="width:100%;table-layout:fixed;background-color:#F3F7FB;">
    <tr><td class="outer" align="center" style="padding:36px 16px 28px;">
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;table-layout:fixed;"><tr>
        <td width="28" style="width:28px;padding-right:10px;" aria-hidden="true"><table role="presentation" width="24" cellpadding="0" cellspacing="0" border="0" style="width:24px;table-layout:fixed;"><tr><td width="11" height="11" bgcolor="#215FF0" style="width:11px;height:11px;background-color:#215FF0;border-radius:3px 3px 0 3px;font-size:0;line-height:0;">&nbsp;</td><td width="2" style="width:2px;font-size:0;line-height:0;">&nbsp;</td><td width="11" bgcolor="#FFCB66" style="width:11px;background-color:#FFCB66;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td height="2" colspan="3" style="height:2px;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td height="11" bgcolor="#B4E2D1" style="height:11px;background-color:#B4E2D1;border-radius:3px;font-size:0;line-height:0;">&nbsp;</td><td style="font-size:0;line-height:0;">&nbsp;</td><td bgcolor="#18334B" style="background-color:#18334B;border-radius:0 3px 3px 3px;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
        <td style="color:#18334B;font-family:'Trebuchet MS',Arial,sans-serif;font-size:21px;font-weight:700;line-height:1.4;">GeoDecoder <span style="color:#526A7D;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:400;">Digital</span></td>
      </tr></table>
      <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <div style="max-width:560px;margin:0 auto;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:100%;max-width:560px;table-layout:fixed;background-color:#FFFFFF;border:1px solid #D9E4ED;border-radius:20px;">
        <tr><td align="center" bgcolor="#EDF3FF" style="text-align:center;padding:24px 16px;background-color:#EDF3FF;border-radius:20px 20px 0 0;">${geometry}</td></tr>
        <tr><td class="content" align="center" style="text-align:center;padding:26px 24px 22px;">
          <h1 class="headline" style="margin:0 0 6px;color:#18334B;font-family:'Trebuchet MS',Arial,sans-serif;font-size:30px;font-weight:700;line-height:1.25;">${escape(item.title)}</h1>
          <p lang="en" style="margin:0 0 22px;color:#526A7D;font-size:15px;line-height:1.5;">${escape(item.englishTitle)}</p>
          ${copy(item.intro)}
          ${copy(item.englishIntro,true,'margin-bottom:18px;')}
          ${item.detail?copy(item.detail,false,'font-weight:700;word-break:break-all;overflow-wrap:anywhere;'):''}
          <p style="margin:0;color:#526A7D;font-size:13px;line-height:1.7;word-break:break-all;overflow-wrap:anywhere;"><strong style="font-weight:600;">{{ .Email }}</strong></p>
          ${action}
          ${copy(item.note,false,'font-size:13px;margin-bottom:5px;')}
          ${copy(item.englishNote,true,'font-size:12px;margin-bottom:0;')}
        </td></tr>
        <tr><td class="content" style="text-align:center;padding:16px 24px 18px;border-top:1px solid #E7EDF4;">
          ${copy(item.safety,false,'font-size:12px;margin-bottom:4px;')}
          ${copy(item.englishSafety,true,'font-size:12px;margin-bottom:0;')}
        </td></tr>
      </table>
      </div><!--[if mso]></td></tr></table><![endif]-->
      <div style="max-width:500px;margin:0 auto;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:500px;table-layout:fixed;"><tr><td align="center" style="text-align:center;padding:0 12px;">
        ${fallback}
        <p style="margin:20px 0 4px;color:#18334B;font-size:12px;font-weight:600;line-height:1.6;">Belajar. Teroka. Temui.</p>
        <p lang="en" style="margin:0 0 12px;color:#526A7D;font-size:11px;line-height:1.6;">Learn. Explore. Discover.</p>
        <p style="margin:0;color:#526A7D;font-size:11px;line-height:1.8;">E-mel automatik <span lang="en">/ Automated email</span><br><a href="{{ .SiteURL }}" style="color:#526A7D;text-decoration:underline;">GeoDecoder Digital</a></p>
      </td></tr></table></div>
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
