import type { Node } from './walk.ts'

export const FIXTURES_DIR = './src/_fixtures'

type Fixture = {
	fileName: string
	expected: Node
}

export const fixtures: Fixture[] = [
	{
		fileName: 'sample_short.eml',
		expected: {
			kind: 'compound',
			headers: {
				'date': 'Wed, 29 Jan 2014 11:10:06 +0100',
				'to': '"Foo Bar" <foo.bar@example.com>',
				'from': 'Online Shop <no-reply@example.com>',
				'subject': 'Winter promotions',
				'content-type': 'multipart/related; type="text/html";\n\tboundary="__1__"',
				'mime-version': '1.0',
			},
			meta: {
				contentType: 'multipart/related',
			},
			boundary: '__1__',
			children: [
				{
					kind: 'compound',
					headers: {
						'content-type': 'multipart/alternative;\n\tboundary="__999__"',
					},
					meta: {
						contentType: 'multipart/alternative',
					},
					boundary: '__999__',
					children: [
						{
							kind: 'simple',
							headers: {
								'content-type': 'text/plain; charset="UTF-8"',
								'content-transfer-encoding': 'quoted-printable',
								'x-some-header': 'text',
							},
							meta: {
								contentType: 'text/plain',
								charset: 'utf-8',
								encoding: 'quoted-printable',
							},
							body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.=0D=0A\n\n',
						},
						{
							kind: 'simple',
							headers: {
								'content-type': 'text/html; charset="UTF-8"',
								'content-transfer-encoding': 'quoted-printable',
								'x-some-header': 'html',
							},
							meta: {
								contentType: 'text/html',
								charset: 'utf-8',
								encoding: 'quoted-printable',
							},
							body: '=09<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>\n\n',
						},
					],
				},
				{
					kind: 'simple',
					headers: {
						'content-disposition': 'attachment; filename="plain-file-1.txt"',
						'content-type': 'text/plain; name="plain-file-1.txt"',
						'x-some-header': 'attachment-1',
					},
					meta: {
						contentType: 'text/plain',
						filename: 'plain-file-1.txt',
						disposition: 'attachment',
					},
					body: 'This is the contents of attachment 1.\n\n',
				},
				{
					kind: 'simple',
					headers: {
						'content-disposition': 'attachment; filename="plain-file-2.txt"',
						'content-type': 'text/plain; name="plain-file-2.txt"',
						'x-some-header': 'attachment-2',
					},
					meta: {
						contentType: 'text/plain',
						filename: 'plain-file-2.txt',
						disposition: 'attachment',
					},
					body: 'This is the contents of attachment 2.\n\n',
				},
			],
		},
	},
	{
		fileName: 'cc.eml',
		expected: {
			kind: 'simple',
			headers: {
				'delivered-to': 'foo.bar@example.com',
				'return-path': '<foo.bar@example.com>',
				'to': 'Foo Bar <foo.bar@example.com>, info@example.com',
				'cc': 'foo@example.com, Bar <bar@example.com>',
				'from': '=?UTF-8?Q?Foo_Bar?= <foo.bar@example.com>',
				'subject': 'To and Cc headers',
				'message-id': '<ecc38b11-aa06-44c9-b8de-283b06a1d89e@example.com>',
				'date': 'Sat, 12 Oct 2019 20:09:08 +0200',
				'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:60.0) Gecko/20100101\n Thunderbird/60.8.0',
				'mime-version': '1.0',
				'content-type': 'text/plain; charset=utf-8; format=flowed',
				'content-transfer-encoding': '7bit',
				'content-language': 'en-US',
				'x-zohomailclient': 'External',
			},
			meta: {
				contentType: 'text/plain',
				encoding: '7bit',
				charset: 'utf-8',
			},
			body: '',
		},
	},
	{
		fileName: 'cc_with_body.eml',
		expected: {
			kind: 'simple',
			headers: {
				'delivered-to': 'foo.bar@example.com',
				'return-path': '<foo.bar@example.com>',
				'to': 'Foo Bar <foo.bar@example.com>, info@example.com',
				'cc': 'foo@example.com, Bar <bar@example.com>',
				'from': '=?UTF-8?Q?Foo_Bar?= <foo.bar@example.com>',
				'subject': 'To and Cc headers',
				'message-id': '<ecc38b11-aa06-44c9-b8de-283b06a1d89e@example.com>',
				'date': 'Sat, 12 Oct 2019 20:09:08 +0200',
				'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:60.0) Gecko/20100101\n Thunderbird/60.8.0',
				'mime-version': '1.0',
				'content-type': 'text/plain; charset=utf-8; format=flowed',
				'content-transfer-encoding': '7bit',
				'content-language': 'en-US',
				'x-zohomailclient': 'External',
			},
			meta: {
				contentType: 'text/plain',
				encoding: '7bit',
				charset: 'utf-8',
			},
			body: '...body content...\n',
		},
	},
	{
		fileName: 'attachment_filenames.eml',
		expected: {
			kind: 'compound',
			headers: {
				'from': 'Foo Bar <foo.bar@example.com>',
				'subject': 'Attachment Filenames',
				'to': 'foo.bar@example.com',
				'date': 'Sun, 29 Apr 2018 14:05:09 -0400',
				'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:52.0) Gecko/20100101\n Thunderbird/52.7.0',
				'mime-version': '1.0',
				'content-type': 'multipart/mixed;\n boundary="------------194F0B6C07FF2414138ED9B2"',
				'content-language': 'en-US',
			},
			meta: {
				contentType: 'multipart/mixed',
			},
			boundary: '------------194F0B6C07FF2414138ED9B2',
			children: [
				{
					body: 'please see attached\n\n\n',
					headers: {
						'content-transfer-encoding': '7bit',
						'content-type': 'text/plain; charset=utf-8; format=flowed',
					},
					kind: 'simple',
					meta: {
						charset: 'utf-8',
						contentType: 'text/plain',
						encoding: '7bit',
					},
				},
				{
					body: 'long filename split into parts\n\n',
					headers: {
						'content-disposition':
							'attachment;\n filename*0="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345.t"; filename*1=xt',
						'content-type':
							'text/plain;\n name*0="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345.t"; name*1=xt',
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345.txt',
					},
				},
				{
					body: 'UTF-8 filename*\n\n',
					headers: {
						'content-disposition': "attachment;\n filename*=utf-8''%E6%96%87%E5%AD%97.txt",
						'content-type': "text/plain;\n name*=utf-8''%E6%96%87%E5%AD%97.txt",
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename: '文字.txt',
					},
				},
				{
					body: 'ISO-8859-1 filename*\n\n',
					headers: {
						'content-disposition': "attachment;\n filename*=iso-8859-1'en'%A3%20rates.txt",
						'content-type': "text/plain;\n name*=iso-8859-1'en'%A3%20rates.txt",
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename: '£ rates.txt',
					},
				},
				{
					body: 'long filename in base64-encoded GB2312 charset\n\n',
					headers: {
						'content-disposition':
							'attachment;\n\tfilename="=?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19bOxNfWzsTX1s7E19Y=?=\n =?gb2312?B?zsTX1i50eHQ=?="; size=1548;\n\tcreation-date="Thu, 26 Dec 2024 04:31:07 GMT";\n\tmodification-date="Thu, 26 Dec 2024 04:31:20 GMT"',
						'content-type': 'text/plain',
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename:
							'文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字文字.txt',
					},
				},
				{
					body: 'fall back to `name` if no `filename`\n\n',
					headers: {
						'content-disposition': 'attachment',
						'content-type': 'text/plain;\n name="a.txt"',
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename: 'a.txt',
					},
				},
				{
					body: 'prefer `filename` over `name`\n\n',
					headers: {
						'content-disposition': 'attachment;\n filename="b.txt"',
						'content-type': 'text/plain;\n name="a.txt"',
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename: 'b.txt',
					},
				},
				{
					body: 'prefer `filename*` over `filename`\n\n',
					headers: {
						'content-disposition': `attachment;\n filename="b.txt"; filename*=utf-8''c.txt`,
						'content-type': 'text/plain;\n name="a.txt"',
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename: 'c.txt',
					},
				},
				{
					body: 'prefer `filename` over `filename*0..n`\n\n',
					headers: {
						'content-disposition': 'attachment;\n filename*0="b.t"; filename*1="xt"; filename="d.txt"',
						'content-type': 'text/plain;\n name="a.txt"',
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename: 'd.txt',
					},
				},
				{
					body: 'prefer `filename*` over `filename*0..n`\n\n',
					headers: {
						'content-disposition':
							`attachment;\n filename*0="b.t"; filename*1="xt"; filename*=utf-8''e.txt`,
						'content-type': 'text/plain;\n name="a.txt"',
					},
					kind: 'simple',
					meta: {
						contentType: 'text/plain',
						disposition: 'attachment',
						filename: 'e.txt',
					},
				},
			],
		},
	},
]
