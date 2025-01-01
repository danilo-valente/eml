import type { Node } from './eml.ts'

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
				'content-type': 'multipart/related; type="text/html";\tboundary="__1__"',
				'mime-version': '1.0',
			},
			boundary: '__1__',
			children: [
				{
					kind: 'compound',
					headers: {
						'content-type': 'multipart/alternative;\tboundary="__999__"',
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
							body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.=0D=0A\n\n',
						},
						{
							kind: 'simple',
							headers: {
								'content-type': 'text/html; charset="UTF-8"',
								'content-transfer-encoding': 'quoted-printable',
								'x-some-header': 'html',
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
					body: 'This is the contents of attachment 1.\n\n',
				},
				{
					kind: 'simple',
					headers: {
						'content-disposition': 'attachment; filename="plain-file-2.txt"',
						'content-type': 'text/plain; name="plain-file-2.txt"',
						'x-some-header': 'attachment-2',
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
				'from': 'Foo Bar <foo.bar@example.com>',
				'subject': 'To and Cc headers',
				'message-id': '<ecc38b11-aa06-44c9-b8de-283b06a1d89e@example.com>',
				'date': 'Sat, 12 Oct 2019 20:09:08 +0200',
				'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:60.0) Gecko/20100101 Thunderbird/60.8.0',
				'mime-version': '1.0',
				'content-type': 'text/plain; charset=utf-8; format=flowed',
				'content-transfer-encoding': '7bit',
				'content-language': 'en-US',
				'x-zohomailclient': 'External',
			},
			body: null,
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
				'from': 'Foo Bar <foo.bar@example.com>',
				'subject': 'To and Cc headers',
				'message-id': '<ecc38b11-aa06-44c9-b8de-283b06a1d89e@example.com>',
				'date': 'Sat, 12 Oct 2019 20:09:08 +0200',
				'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:60.0) Gecko/20100101 Thunderbird/60.8.0',
				'mime-version': '1.0',
				'content-type': 'text/plain; charset=utf-8; format=flowed',
				'content-transfer-encoding': '7bit',
				'content-language': 'en-US',
				'x-zohomailclient': 'External',
			},
			body: '...body content...\n',
		},
	},
]
