require "minitest/autorun"
require "stringio"
require "tmpdir"
require_relative "prepare_signing_key"

class LunmiSigningKeyClipboardTest < Minitest::Test
  def setup
    @output = StringIO.new
    @errors = StringIO.new
    @copied = []
    @writer = ->(value) { @copied << value }
  end

  def run_helper(arguments, writer: @writer)
    LunmiSigningKeyClipboard.run(arguments, output: @output, error_output: @errors, clipboard_writer: writer)
  end

  def test_copies_validated_file_without_printing_key_or_selecting_environment_content
    pem = OpenSSL::PKey::EC.generate("prime256v1").to_pem
    Dir.mktmpdir("lunmi-clipboard-test-") do |directory|
      file = File.join(directory, "synthetic key.p8")
      File.write(file, "\uFEFF'#{pem.gsub("\n", '\\n')}'")
      previous = ENV["ASC_KEY_CONTENT"]
      begin
        ENV["ASC_KEY_CONTENT"] = "SYNTHETIC_IGNORED_ENVIRONMENT_MARKER"
        assert_equal 0, run_helper([file])
      ensure
        ENV["ASC_KEY_CONTENT"] = previous
      end
    end
    assert_equal [Base64.strict_encode64(pem)], @copied
    assert_empty @errors.string
    refute_includes @output.string, pem
    refute_includes @output.string, @copied.first
    assert_includes @output.string, "Remove ASC_KEY_CONTENT"
    assert_includes @output.string, "ASC_KEY_CONTENT_BASE64"
  end

  def test_invalid_file_never_reaches_clipboard_or_exposes_input
    Dir.mktmpdir("lunmi-clipboard-test-") do |directory|
      file = File.join(directory, "invalid.p8")
      File.write(file, "SYNTHETIC_INVALID_PRIVATE_MATERIAL")
      assert_equal 1, run_helper([file])
    end
    assert_empty @copied
    assert_empty @output.string
    refute_includes @errors.string, "SYNTHETIC_INVALID_PRIVATE_MATERIAL"
  end

  def test_help_missing_extra_arguments_and_missing_file_never_copy
    assert_equal 0, run_helper(["--help"])
    [[], ["one.p8", "two.p8"], ["--unknown"], ["/nonexistent/synthetic-key.p8"]].each do |arguments|
      assert_equal 1, run_helper(arguments)
    end
    assert_empty @copied
  end

  def test_clipboard_failure_does_not_print_success_or_key_contents
    pem = OpenSSL::PKey::EC.generate("prime256v1").to_pem
    Dir.mktmpdir("lunmi-clipboard-test-") do |directory|
      file = File.join(directory, "synthetic.p8")
      File.write(file, pem)
      [LunmiSigningKeyClipboard::ClipboardError, Errno::EPIPE, Errno::ENOENT].each do |error_class|
        assert_equal 1, run_helper([file], writer: ->(_) { raise error_class })
      end
    end
    assert_empty @output.string
    refute_includes @errors.string, pem
    refute_includes @errors.string, Base64.strict_encode64(pem)
  end
end
