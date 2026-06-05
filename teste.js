const bcrypt = require('bcryptjs');

(async () => {
  const hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uAnc/IThW';

  console.log(await bcrypt.compare('123456', hash));
})();



