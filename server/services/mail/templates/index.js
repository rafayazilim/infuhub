const { verificationCodeEmailTemplate } = require('./verificationCodeEmailTemplate');
const { resetPasswordEmailTemplate } = require('./resetPasswordEmailTemplate');
const { accountStatusEmailTemplate } = require('./accountStatusEmailTemplate');
const { campaignOfferEmailTemplate } = require('./campaignOfferEmailTemplate');
const { transactionalEventEmailTemplate } = require('./transactionalEventEmailTemplate');
const { systemTestEmailTemplate } = require('./systemTestEmailTemplate');

module.exports = {
  verificationCodeEmailTemplate,
  resetPasswordEmailTemplate,
  accountStatusEmailTemplate,
  campaignOfferEmailTemplate,
  transactionalEventEmailTemplate,
  systemTestEmailTemplate,
};
