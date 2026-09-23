import { extractUrlHosts, websiteHost } from './url-hosts';

describe('extractUrlHosts', () => {
  it('提取 markdown 与裸链接中的主机名并去重', () => {
    const text = [
      '看 [arXiv](https://arxiv.org/list/cs.CL/recent) 和 https://huggingface.co/models，',
      '再看 https://huggingface.co/datasets 与 [HF](https://www.huggingface.co/pricing)。',
    ].join('\n');
    expect(extractUrlHosts(text)).toEqual(['arxiv.org', 'huggingface.co']);
  });

  it('忽略非法链接与无点主机', () => {
    expect(
      extractUrlHosts('http://localhost:3001/api 和 https:// broken'),
    ).toEqual([]);
  });

  it('空文本返回空数组', () => {
    expect(extractUrlHosts('')).toEqual([]);
  });
});

describe('websiteHost', () => {
  it('解析主机名并归一化', () => {
    expect(websiteHost('https://www.semanticscholar.org/search')).toBe(
      'semanticscholar.org',
    );
    expect(websiteHost('https://HF-Mirror.com')).toBe('hf-mirror.com');
  });

  it('非法地址返回 null', () => {
    expect(websiteHost('not-a-url')).toBeNull();
    expect(websiteHost('')).toBeNull();
  });
});
