require "minitest/autorun"
require "tmpdir"
require_relative "signing_key"

class LunmiSigningKeyTest < Minitest::Test
  def setup
    @key = OpenSSL::PKey::EC.generate("prime256v1")
    @pem = @key.to_pem
  end

  def test_accepts_pkcs8_and_preserves_the_private_key
    algorithm = OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::ObjectId("id-ecPublicKey"), OpenSSL::ASN1::ObjectId("prime256v1")
    ])
    der = OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::Integer(0), algorithm, OpenSSL::ASN1::OctetString(@key.to_der)
    ]).to_der
    pem = "-----BEGIN PRIVATE KEY-----\n" + Base64.strict_encode64(der).scan(/.{1,64}/).join("\n") + "\n-----END PRIVATE KEY-----\n"
    restored = OpenSSL::PKey::EC.new(LunmiSigningKey.load(content: pem))
    assert_equal @key.public_key.to_octet_string(:uncompressed), restored.public_key.to_octet_string(:uncompressed)
    digest = OpenSSL::Digest::SHA256.digest("synthetic local test")
    assert restored.dsa_verify_asn1(digest, restored.dsa_sign_asn1(digest))
  end

  def test_accepts_pem_whitespace_bom_quotes_and_newline_variants
    variants = [@pem, "\n  #{@pem}\n", "\uFEFF#{@pem}", "'\n#{@pem}\n'",
                %Q("#{@pem.gsub("\n", '\\n')}"), @pem.gsub("\n", "\r\n"),
                @pem.gsub("\n", '\\r\\n')]
    variants.each { |value| assert_equal @pem, LunmiSigningKey.load(content: value) }
  end

  def test_accepts_explicit_base64_with_line_wrapping_or_quotes
    encoded = Base64.strict_encode64(@pem)
    assert_equal @pem, LunmiSigningKey.load(content_base64: encoded)
    assert_equal @pem, LunmiSigningKey.load(content_base64: "'#{encoded.scan(/.{1,64}/).join("\n")}'")
  end

  def test_rejects_ambiguous_inputs_instead_of_selecting_a_different_key
    assert_raises(LunmiSigningKey::InvalidKey) do
      LunmiSigningKey.load(content: @pem, content_base64: Base64.strict_encode64(@pem))
    end
  end

  def test_rejects_bad_base64_missing_assignment_text_and_truncated_keys
    [nil, "", "not a private key", "ASC_KEY_CONTENT='#{@pem}'", @pem.lines[0...-2].join,
     Base64.strict_encode64(@pem)].each do |value|
      assert_raises(LunmiSigningKey::InvalidKey) { LunmiSigningKey.load(content: value) }
    end
    assert_raises(LunmiSigningKey::InvalidKey) { LunmiSigningKey.load(content_base64: "not!base64") }
  end

  def test_rejects_public_rsa_wrong_curve_and_broken_pem_keys
    rsa = OpenSSL::PKey::RSA.generate(1024)
    wrong_curve = OpenSSL::PKey::EC.generate("secp384r1")
    public_der = OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::Sequence([OpenSSL::ASN1::ObjectId("id-ecPublicKey"), OpenSSL::ASN1::ObjectId("prime256v1")]),
      OpenSSL::ASN1::BitString(@key.public_key.to_octet_string(:uncompressed))
    ]).to_der
    public_pem = "-----BEGIN PUBLIC KEY-----\n#{Base64.strict_encode64(public_der)}\n-----END PUBLIC KEY-----\n"
    broken = "-----BEGIN PRIVATE KEY-----\nSYNTHETIC_INVALID_KEY_MARKER\n-----END PRIVATE KEY-----\n"
    [rsa.to_pem, wrong_curve.to_pem, public_pem, broken].each do |value|
      error = assert_raises(LunmiSigningKey::InvalidKey) { LunmiSigningKey.load(content: value) }
      refute_includes error.message, "SYNTHETIC_INVALID_KEY_MARKER"
      refute_includes error.message, value
    end
  end

  def test_reads_a_local_key_file_when_environment_content_is_absent
    Dir.mktmpdir("lunmi-synthetic-key-") do |directory|
      file = File.join(directory, "synthetic.p8")
      File.write(file, @pem)
      assert_equal @pem, LunmiSigningKey.load(path: file)
    end
  end

  def test_rejects_encrypted_keys_without_requesting_a_password
    encrypted = @key.export(OpenSSL::Cipher.new("aes-128-cbc"), "synthetic-test-password")
    assert_raises(LunmiSigningKey::InvalidKey) { LunmiSigningKey.load(content: encrypted) }
  end

  def test_invalid_encoding_reports_a_sanitized_configuration_error
    error = assert_raises(LunmiSigningKey::InvalidKey) { LunmiSigningKey.load(content: "\xFF".b) }
    assert_match(/valid UTF-8/, error.message)
    assert_raises(LunmiSigningKey::InvalidKey) { LunmiSigningKey.load(content_base64: "\xFF".b) }
  end
end
