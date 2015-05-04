var aws = require('aws-sdk');

process.env.AWS_ACCESS_KEY_ID = framework.config.aws_key
process.env.AWS_SECRET_ACCESS_KEY=framework.config.aws_secret
process.env.AWS_CANONICAL_ID = framework.config.dmusername
process.env.AWS_CANONICAL_NAME = framework.config.dmusername
aws.config.endpoint = framework.config.host;

var s3 = new aws.S3();
global.dreamObjects = s3;