/**
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2020 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.test;

import com.wegas.core.Helper;
import com.wegas.core.exception.client.WegasErrorMessage;
import org.junit.*;
import static org.junit.Assert.assertEquals;
import org.postgresql.util.PSQLException;
import org.postgresql.util.PSQLState;
import org.postgresql.util.ServerErrorMessage;

/**
 *
 * @author Cyril Junod (cyril.junod at gmail.com)
 */
public class HelperTest {


    @Test
    public void testStripLabelSuffix() {
        System.out.println("stripLabelSuffix");
        assertEquals("test1String", Helper.stripLabelSuffix("test1String(32)"));
        assertEquals("test(1String)", Helper.stripLabelSuffix("test(1String)(32)"));
        assertEquals("test(1String32)", Helper.stripLabelSuffix("test(1String32)"));
        assertEquals("test1String(3s2)", Helper.stripLabelSuffix("test1String(3s2)"));
    }

    @Test
    public void testGetLabelSuffix() {
        System.out.println("getLabelSuffix");
        assertEquals(32, Helper.getLabelSuffix("test1String(32)"));
        assertEquals(32, Helper.getLabelSuffix("test(1String)(32)"));
        assertEquals(0, Helper.getLabelSuffix("test(1String32)"));
    }

    @Test
    public void testEncodeVariableName() {
        System.out.println("encodeVariableName");
        assertEquals("testEncode", Helper.encodeVariableName("test encode"));
        assertEquals("a4", Helper.encodeVariableName("a 4"));
        assertEquals("_5Test1", Helper.encodeVariableName("5 test 1"));
        try {
            Helper.encodeVariableName(null);
        } catch (Throwable t) {
            assertEquals(NullPointerException.class, t.getClass());
        }
        try {
            Helper.encodeVariableName("");
        } catch (Throwable t) {
            assertEquals(WegasErrorMessage.class, t.getClass());
        }
    }

    @Test
    public void testHumanize(){
        assertEquals("some files", Helper.humanize("SomeFiles"));
        assertEquals("PDF file", Helper.humanize("PDFFile"));
        assertEquals("99 files", Helper.humanize("99Files"));
        assertEquals("file 123", Helper.humanize("File123"));
        assertEquals("some pDF files", Helper.humanize("SomePDFFiles"));
    }

    @Test
    public void testPSQLExceptionParse(){
        ServerErrorMessage serverErrorMessage = new ServerErrorMessage("SERROR VERROR C23505 Mduplicate key value violates unique constraint \"index_accountdetails_email\" DKey (email)=(maxence.laurent+p2@gmail.com) already exists. spublic taccountdetails nindex_accountdetails_email Fnbtinsert.c L534 R_bt_check_unique  ");
        PSQLException ex = new PSQLException(serverErrorMessage);

        String pp = Helper.prettyPrintPSQLException(ex);

        System.out.println(pp);
    }
}
